//start

// main.js
// Частина 2 — читання JSON та обробка запиту з формуванням XML

const http = require('http');                 // Для створення сервера
const fs = require('fs').promises;           // Асинхронні методи readFile/writeFile
const path = require('path');                 // Для роботи з шляхами
const { program } = require('commander');    // Для аргументів командного рядка
const { XMLBuilder } = require('fast-xml-parser'); // Для формування XML
const url = require('url');                   // Для парсингу URL і query-параметрів

// Настройка Commander.js
program
  .requiredOption('-i, --input <path>', 'шлях до JSON-файлу для читання')
  .requiredOption('-h, --host <host>', 'адреса сервера')
  .requiredOption('-p, --port <port>', 'порт сервера')
  .parse(process.argv);

const options = program.opts();
const inputPath = path.resolve(process.cwd(), options.input); // абсолютний шлях до файлу
const host = options.host;
const port = Number(options.port);

// Перевірка наявності файлу
const fsSync = require('fs');
if (!fsSync.existsSync(inputPath)) {
  console.error('Cannot find input file');
  process.exit(1);
}

// Функція для перетворення масиву банків у XML
function buildXml(banksArray) {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,           // гарне форматування
    suppressEmptyNode: true
  });

  const obj = { banks: { bank: banksArray } }; // коренева структура <banks><bank>...</bank></banks>
  return builder.build(obj);
}

// Обробка кожного HTTP-запиту
async function handleRequest(req, res) {
  try {
    const parsedUrl = url.parse(req.url, true); // розбираємо URL і query-параметри
    const query = parsedUrl.query || {};
    const showMfo = String(query.mfo) === 'true';
    const onlyNormal = String(query.normal) === 'true';

    // Читаємо JSON асинхронно
    const rawData = await fs.readFile(inputPath, 'utf8');
    let data;
    try {
      data = JSON.parse(rawData); // перетворюємо у JS-обʼєкт
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Invalid JSON in input file');
      return;
    }

    // Визначаємо масив записів незалежно від структури
    let records = [];
    if (Array.isArray(data)) records = data;
    else if (Array.isArray(data.banks)) records = data.banks;
    else if (Array.isArray(data.BankManagers)) records = data.BankManagers;
    else records = Object.values(data).flat().filter(Boolean);

    // Фільтруємо лише банки зі станом COD_STATE = 1, якщо потрібно
    if (onlyNormal) {
      records = records.filter(r => String(r.COD_STATE) === '1');
    }

    // Формуємо масив обʼєктів для XML
    const banksForXml = records.map(r => {
      const bank = {};
      if (showMfo && r.MFO !== undefined) bank.mfo_code = String(r.MFO);
      bank.name = r.NAME || r.Name || r.name || '';        // враховуємо різні можливі поля
      bank.state_code = r.COD_STATE !== undefined ? String(r.COD_STATE) : '';
      return bank;
    });

    // Перетворюємо у XML
    const xml = buildXml(banksForXml);

    // Відповідаємо клієнту
    res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
    res.end(xml);

  } catch (err) {
    console.error('Server error:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
}

// Запуск сервера
const server = http.createServer(handleRequest);
server.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}/`);
});
