const fs = require('fs');

const files = [
  'postcss.config.js',
  'tailwind.config.js',
  'vite.config.js'
];

files.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    // 去掉 UTF-8 BOM 头（如果存在）
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    // 强制以 UTF-8 无 BOM 写入
    fs.writeFileSync(file, content, { encoding: 'utf8' });
    console.log(`✅ 已修复: ${file}`);
  } catch (e) {
    console.error(`❌ 失败: ${file}`, e.message);
  }
});

console.log('全部文件已重写为纯净 UTF-8。');
