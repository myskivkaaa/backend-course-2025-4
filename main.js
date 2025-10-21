//start

// Частина 1 — спільні параметри командного рядка

// Підключаємо потрібні модулі
const http = require('http');                 // Для створення HTTP-сервера
const fs = require('fs');                     // Для роботи з файлами
const path = require('path');                 // Для роботи з шляхами
const { program } = require('commander');    // Для зручного читання аргументів командного рядка

// Налаштовуємо командний рядок
program
  .requiredOption('-i, --input <path>', 'шлях до JSON-файлу для читання')  // обов'язковий аргумент
  .requiredOption('-h, --host <host>', 'адреса сервера')                     // обов'язковий аргумент
  .requiredOption('-p, --port <port>', 'порт сервера')                      // обов'язковий аргумент
  .parse(process.argv);                                                     // розбирає аргументи

const options = program.opts();                // зберігаємо параметри у змінну

// Перевірка: чи існує файл
const inputPath = path.resolve(process.cwd(), options.input); // абсолютний шлях
if (!fs.existsSync(inputPath)) {              // якщо файл не знайдено
  console.error('Cannot find input file');   // виводимо помилку
  process.exit(1);                            // завершуємо програму
}

// Змінні для запуску сервера
const host = options.host;
const port = Number(options.port);

// Створюємо простий HTTP-сервер
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Сервер працює!');  // відповідаємо простим текстом
});

// Запускаємо сервер на вказаному хості і порті
server.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}/`);
});
