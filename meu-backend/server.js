const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

const db = new sqlite3.Database('usuarios.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);

const runAsync = (query, params) => new Promise((resolve, reject) => {
  db.run(query, params, function (err) {
    if (err) {
      reject(err);
    } else {
      resolve(this);
    }
  });
});

const getAsync = (query, params) => new Promise((resolve, reject) => {
  db.get(query, params, (err, row) => {
    if (err) {
      reject(err);
    } else {
      resolve(row);
    }
  });
});

app.post('/register', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    const row = await getAsync('SELECT * FROM usuarios WHERE email = ?', [email]);

    if (row) {
      return res.status(409).json({ error: 'Email já registrado' });
    }

    await runAsync('INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)', [nome, email, senha]);

    // Após inserir o usuário, obter o ID do usuário recém-registrado
    const newUser = await getAsync('SELECT id, nome FROM usuarios WHERE email = ?', [email]);

    return res.status(201).json({ message: 'Usuário registrado com sucesso', userId: newUser.id, userName: newUser.nome });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error.message);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});


app.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    const row = await getAsync('SELECT id, nome FROM usuarios WHERE email = ? AND senha = ?', [email, senha]);

    if (row) {
      return res.status(200).json({ message: 'Login bem-sucedido', userId: row.id, userName: row.nome });
    } else {
      console.log('Falha no login para o email:', email);
      return res.status(401).json({ error: 'Email/senha inválidos' });
    }
  } catch (error) {
    console.error('Erro ao verificar credenciais:', error.message);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
