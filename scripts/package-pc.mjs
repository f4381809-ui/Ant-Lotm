import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { zipSync } from 'fflate';

const instructions = `ANT-LOTM — АНКЕТАРИЙ ДЛЯ ПК

1. Распакуйте весь архив в удобную папку.
2. Откройте Ant-Lotm.html двойным щелчком в Chrome, Edge или Firefox.
3. Создайте персонажа и ведите дневник усвоения зелья.

Нажмите на рамку портрета, чтобы добавить картинку персонажа.
Записывайте события в большое поле прямо в анкете. Сохранить запись можно
кнопкой или сочетанием Ctrl+Enter. Незавершённый текст сохраняется как черновик.
Кнопка «Исправить» под записью позволяет отредактировать её текст.

Устанавливать программы, запускать сервер и подключаться к интернету не нужно.

Анкеты сохраняются только в вашем браузере. Для резервной копии нажмите
«Скачать архив» внутри приложения. Это JSON-файл с персонажами, портретами
и сохранёнными записями. Несохранённые черновики в него не входят.

Перед перемещением или заменой HTML-файла, сменой браузера либо очисткой
данных браузера обязательно экспортируйте анкеты: хранилище локальных
HTML-файлов зависит от браузера и расположения файла. Для восстановления
воспользуйтесь кнопкой «Импортировать» внутри приложения.

Обновления и исходный код: https://github.com/f4381809-ui/Ant-Lotm
`;

const timestamp = new Date(2020, 0, 1);
const html = new Uint8Array(await readFile(new URL('../docs/index.html', import.meta.url)));
const archive = zipSync({
  'Ant-Lotm.html': [html, { mtime: timestamp }],
  'README.txt': [new TextEncoder().encode(instructions), { mtime: timestamp }],
}, { level: 9 });

await mkdir(new URL('../downloads/', import.meta.url), { recursive: true });
await writeFile(new URL('../downloads/Ant-Lotm-PC.zip', import.meta.url), archive);
console.log(`PC archive: downloads/Ant-Lotm-PC.zip (${Math.round(archive.length / 1024)} KB)`);
