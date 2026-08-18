import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = (await readFile(new URL('../_worker.js', import.meta.url), 'utf8'))
    .replace('export default {', 'globalThis.worker = {');

const context = vm.createContext({
    AbortController,
    Request,
    Response,
    TextDecoder,
    URL,
    URLSearchParams,
    atob,
    btoa,
    clearTimeout,
    console,
    fetch: async () => new Response('', { status: 404 }),
    setTimeout,
});
vm.runInContext(source, context);

function run(expression) {
    return vm.runInContext(expression, context);
}

const uuid = '11111111-1111-4111-8111-111111111111';

test('WebSocket remains the default transport', () => {
    const [link] = run(`generateLinksFromSource(
        [{ ip: '1.1.1.1', name: 'default' }],
        '${uuid}', 'node.example.com', true, '/ws'
    )`);
    const url = new URL(link);

    assert.equal(url.searchParams.get('type'), 'ws');
    assert.equal(url.searchParams.get('mode'), null);
    assert.match(decodeURIComponent(url.hash), /-WS-TLS$/);
});

test('VLESS XHTTP links contain the expected transport settings', () => {
    const [link] = run(`generateLinksFromSource(
        [{ ip: '1.1.1.1', name: 'xhttp' }],
        '${uuid}', 'node.example.com', true, '/xhttp path', null, 'xhttp'
    )`);
    const url = new URL(link);

    assert.equal(url.searchParams.get('type'), 'xhttp');
    assert.equal(url.searchParams.get('mode'), 'auto');
    assert.equal(url.searchParams.get('host'), 'node.example.com');
    assert.equal(url.searchParams.get('path'), '/xhttp path');
    assert.match(decodeURIComponent(url.hash), /-XHTTP-TLS$/);
});

test('Trojan and VMess generators apply XHTTP consistently', async () => {
    const [trojanLink] = await run(`generateTrojanLinksFromSource(
        [{ ip: '1.1.1.1', name: 'trojan' }],
        '${uuid}', 'node.example.com', true, '/x', null, 'xhttp'
    )`);
    const trojan = new URL(trojanLink);
    assert.equal(trojan.searchParams.get('type'), 'xhttp');
    assert.equal(trojan.searchParams.get('mode'), 'auto');

    const [vmessLink] = run(`generateVMessLinksFromSource(
        [{ ip: '1.1.1.1', name: 'vmess' }],
        '${uuid}', 'node.example.com', true, '/x', null, 'xhttp'
    )`);
    const vmess = JSON.parse(Buffer.from(vmessLink.slice('vmess://'.length), 'base64').toString());
    assert.equal(vmess.net, 'xhttp');
    assert.equal(vmess.mode, 'auto');
    assert.equal(vmess.path, '/x');
});

test('GitHub IPv6 sources produce valid bracketed XHTTP links', () => {
    const [link] = run(`generateLinksFromNewIPs(
        [{ ip: '2606:4700:4700::1111', port: 443, name: 'ipv6' }],
        '${uuid}', 'node.example.com', '/', null, 'xhttp'
    )`);
    const url = new URL(link);

    assert.equal(url.hostname, '[2606:4700:4700::1111]');
    assert.equal(url.searchParams.get('type'), 'xhttp');
});

test('subscription endpoint accepts transport=xhttp', async () => {
    run('epd = false; epi = false; egi = false;');
    const request = new Request(
        `https://worker.example.com/${uuid}/sub?domain=node.example.com&epd=no&epi=no&egi=no&dkby=yes&transport=xhttp&path=%2Fapi`
    );
    const response = await context.worker.fetch(request, {}, {});
    assert.equal(response.status, 200);

    const links = Buffer.from(await response.text(), 'base64').toString().split('\n');
    assert.equal(links.length, 1);
    const node = new URL(links[0]);
    assert.equal(node.searchParams.get('type'), 'xhttp');
    assert.equal(node.searchParams.get('mode'), 'auto');
    assert.equal(node.searchParams.get('path'), '/api');
});

test('home page exposes the XHTTP transport option', async () => {
    const response = await context.worker.fetch(new Request('https://worker.example.com/'), {}, {});
    const html = await response.text();

    assert.match(html, /<select id="transport">/);
    assert.match(html, /<option value="xhttp">XHTTP<\/option>/);
    assert.match(html, /subscriptionUrl \+= '&transport=xhttp'/);
});

test('built-in Clash output uses xhttp-opts', () => {
    const [link] = run(`generateLinksFromSource(
        [{ ip: '1.1.1.1', name: 'clash' }],
        '${uuid}', 'node.example.com', true, '/x http', null, 'xhttp'
    )`);
    context.testLink = link;
    const yaml = run('generateClashConfig([testLink])');

    assert.match(yaml, /network: xhttp/);
    assert.match(yaml, /xhttp-opts:/);
    assert.match(yaml, /path: "\/x http"/);
    assert.match(yaml, /mode: auto/);
});
