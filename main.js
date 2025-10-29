//start

// main.js
// Частина 2 — читання JSON та обробка запиту з формуванням XML

const http = require('http');                     // Для створення сервера
const fs = require('fs').promises;               // Асинхронні методи readFile/writeFile
const path = require('path');                     // Для роботи з шляхами
const { program } = require('commander');        // Для аргументів командного рядка
const { XMLBuilder } = require('fast-xml-parser'); // Для формування XML
const url = require('url');                       // Для парсингу URL і query-параметрів

// --- 1. Налаштування Commander.js ---
program
  .requiredOption('-i, --input <path>', 'шлях до JSON-файлу для читання')
  .requiredOption('-h, --host <host>', 'адреса сервера')
  .requiredOption('-p, --port <port>', 'порт сервера')
  .parse(process.argv);

const options = program.opts();
const inputPath = path.resolve(process.cwd(), options.input);
const host = options.host;
const port = Number(options.port);

// --- 2. Перевірка існування файлу ---
const fsSync = require('fs');
if (!fsSync.existsSync(inputPath)) {
  console.error('Cannot find input file');
  process.exit(1);
}

// --- 3. Функція побудови XML ---
function buildXml(banksArray) {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    suppressEmptyNode: true
  });

  const obj = { banks: { bank: banksArray } };
  return builder.build(obj);
}

// --- 4. Обробник запитів ---
async function handleRequest(req, res) {
  try {
    const parsedUrl = url.parse(req.url, true);
    const query = parsedUrl.query || {};
    const showMfo = String(query.mfo) === 'true';
    const onlyNormal = String(query.normal) === 'true';

    // --- 5. Читаємо JSON ---
    const rawData = await fs.readFile(inputPath, 'utf8');
    let data;
    try {
      data = JSON.parse(rawData);
    } catch {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Invalid JSON in input file');
      return;
    }

    // --- 6. Витягуємо записи ---
    let records = [];
    if (Array.isArray(data)) records = data;
    else if (Array.isArray(data.banks)) records = data.banks;
    else if (Array.isArray(data.BankManagers)) records = data.BankManagers;
    else records = Object.values(data).flat().filter(Boolean);

    // --- 7. Фільтруємо "нормальні" банки ---
    if (onlyNormal) {
      records = records.filter(r => String(r.COD_STATE) === '1');
    }

    // --- 8. Формуємо дані для XML ---
    const banksForXml = records.map(r => {
      const bank = {};

      // Додаємо MFO, якщо треба
      if (showMfo && r.MFO !== undefined) bank.mfo_code = String(r.MFO);

      //  Основна зміна — правильні поля назв банку
      bank.name = r.SHORTNAME || r.FULLNAME || r.NAME || '';

      bank.state_code = r.COD_STATE !== undefined ? String(r.COD_STATE) : '';
      return bank;
    });

    // --- 9. Генеруємо XML ---
    const xml = buildXml(banksForXml);

    // --- 10. Відправляємо клієнту ---
    res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
    res.end(xml);

  } catch (err) {
    console.error('Server error:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
}

// --- 11. Запуск сервера ---
const server = http.createServer(handleRequest);
server.listen(port, host, () => {
  console.log(` Server running at http://${host}:${port}/`);
});

