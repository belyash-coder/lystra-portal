const bcrypt = require('bcryptjs');

async function generateHash() {
  const myPassword = 'ТВОЙ_ОБЫЧНЫЙ_ПАРОЛЬ'; // Впиши сюда свой пароль от аккаунта
  const hash = await bcrypt.hash(myPassword, 10);
  console.log('Твой хэш для базы данных:');
  console.log(hash);
}

generateHash();