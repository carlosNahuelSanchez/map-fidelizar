import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const routeFixture = JSON.parse(readFileSync(new URL('./fixtures/formosa-route.json', import.meta.url), 'utf8'));
async function ready(page) { await page.goto('/'); await expect(page.locator('.argentina-map')).toBeVisible(); await expect(page.locator('.header-title')).toContainText('916 locales'); }
async function selectPanDeCasa(page) {
  await page.getByRole('searchbox').fill('Pan de Casa');
  const stores = page.locator('.local-list-button').filter({ hasText: 'Pan de Casa' });
  await expect(stores).toHaveCount(6);
  await stores.first().click();
  await expect(page.locator('.local-popup')).toBeVisible();
}

test('desktop: source data, readable logos, contacts, Pan de Casa and free panning', async ({ page }) => {
  const errors=[]; page.on('pageerror', error=>errors.push(error.message));
  await ready(page);
  const data = await (await page.request.get('/data/locations.json')).json();
  expect(data.businesses.some(local => /grido/i.test([local.name, local.brandId, local.website, local.instagram].join(' ')))).toBe(false);
  expect(data.businesses.filter(local => local.province === 'Formosa')).toHaveLength(42);
  expect(data.businesses.every(local => local.instagram || local.website)).toBe(true);
  await selectPanDeCasa(page);
  await expect(page.locator('.local-popup')).not.toContainText('README');
  await expect(page.locator('.local-popup').getByRole('link', { name: 'Fuente del punto' })).toBeVisible();
  await expect(page.locator('.local-popup').getByRole('link', { name: '+543704679344', exact: true })).toBeVisible();
  expect(await page.locator('.local-logo-pin').first().evaluate(el => el.getBoundingClientRect().width)).toBe(42);
  const svg = await page.request.get('/logos/site-chocolatesrapanui-com-ar.svg');
  expect(svg.headers()['content-type']).toContain('image/svg+xml');
  await page.screenshot({ path:'test-artifacts/desktop.png' });
  const pane = page.locator('.leaflet-map-pane');
  const before = await pane.evaluate(el=>el.style.transform);
  await page.mouse.move(1180, 740); await page.mouse.down(); await page.mouse.move(790, 620, { steps:20 }); await page.mouse.up();
  await page.waitForTimeout(450);
  const after = await pane.evaluate(el=>el.style.transform);
  expect(after).not.toBe(before);
  await page.waitForTimeout(900);
  expect(await pane.evaluate(el=>el.style.transform)).toBe(after);
  expect(errors).toEqual([]);
});

test('mobile: full-height map, hamburger controls, point picking and install help', async ({ page }) => {
  await page.setViewportSize({ width:390, height:844 }); await ready(page);
  const rectangle=await page.locator('.map-workspace').boundingBox();
  expect(rectangle.height).toBeGreaterThan(750);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  await expect(page.locator('.explore-panel')).not.toBeVisible();
  await page.getByRole('button',{name:'Abrir opciones del mapa'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button',{name:'Marcar un punto en el mapa'}).click();
  await expect(page.locator('.map-notice')).toContainText('Tocá el mapa');
  await page.locator('.argentina-map').click({position:{x:195,y:440}});
  await expect(page.locator('.destination-name')).toHaveText('Punto marcado');
  await expect(page.getByRole('link',{name:'Abrir navegación en Google Maps'})).toHaveAttribute('href',/destination=/);
  await page.getByRole('button',{name:'Cerrar menú'}).click();
  await expect(page.locator('.explore-panel')).not.toBeVisible();
  await page.waitForTimeout(900);
  await page.screenshot({path:'test-artifacts/mobile.png'});
  await page.getByRole('button',{name:'Abrir opciones del mapa'}).click();
  await page.getByRole('button',{name:'Instalar en el teléfono'}).click();
  await expect(page.locator('.install-help')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.explore-panel')).not.toBeVisible();
});

test('navigation: GPS tracking, route failure recovery, instructions and position updates', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({latitude:-26.184152,longitude:-58.17179,accuracy:8});
  let calls=0;
  await page.route('https://router.project-osrm.org/**',async request=>{
    calls++;
    expect(request.request().url()).toContain('steps=true');
    if(calls===1) await request.fulfill({status:503,body:'unavailable',headers:{'access-control-allow-origin':'*'}});
    else await request.fulfill({json:routeFixture,headers:{'access-control-allow-origin':'*'}});
  });
  await ready(page); await selectPanDeCasa(page);
  await page.getByRole('button',{name:'Cómo llegar'}).click();
  await page.getByRole('button',{name:'Iniciar guía'}).click();
  await expect(page.locator('.guidance-panel')).toBeVisible();
  await expect(page.getByRole('button',{name:'Reintentar ruta'})).toBeVisible();
  await page.getByRole('button',{name:'Reintentar ruta'}).click();
  await expect(page.locator('.route-summary')).toContainText('En auto');
  const initial = await page.locator('.guidance-footer strong').textContent();
  const coordinates=routeFixture.routes[0].geometry.coordinates;
  const halfway=coordinates[Math.floor(coordinates.length/2)];
  await context.setGeolocation({latitude:halfway[1],longitude:halfway[0],accuracy:8});
  await expect.poll(async()=>page.locator('.guidance-footer strong').textContent()).not.toBe(initial);
  await expect(page.getByRole('button',{name:'Pausar seguimiento GPS'})).toBeVisible();
  await page.mouse.move(1180,740);await page.mouse.down();await page.mouse.move(900,670,{steps:10});await page.mouse.up();
  await expect(page.getByRole('button',{name:'Seguir mi ubicación',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Detener guía'}).click();
  await expect(page.locator('.guidance-panel')).not.toBeVisible();
});

test('PWA: valid install manifest and cached records available offline', async ({ page, context }) => {
  await ready(page);
  const manifest=await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.some(icon=>icon.sizes==='192x192')).toBe(true);
  expect(manifest.icons.some(icon=>icon.sizes==='512x512'&&icon.purpose==='maskable')).toBe(true);
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await expect.poll(async()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);await page.reload();
  await expect(page.locator('.argentina-map')).toBeVisible();
  await expect(page.locator('.header-title')).toContainText('916 locales');
  await expect(page.locator('.offline-notice')).toContainText('Sin conexión');
  await page.getByRole('searchbox').fill('Pan de Casa');
  await expect(page.locator('.local-list-button').filter({hasText:'Pan de Casa'})).toHaveCount(6);
  await context.setOffline(false);
});
