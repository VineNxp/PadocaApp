const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(bodyParser.json());

// Cria uma conexão com o banco de dados em modo READWRITE | CREATE
const db = new sqlite3.Database('avaliacoes.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);

// Criação da tabela 'avaliacoes' (se ainda não existir)
db.run(`
  CREATE TABLE IF NOT EXISTS avaliacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario TEXT,
    id_produto TEXT,
    avaliacao INTEGER
  )
`, (err) => {
  if (err) {
    console.error('Erro ao criar tabela:', err.message);
  } else {
    console.log('Tabela criada com sucesso');
  }
});

// Middleware para tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Erro interno do servidor');
});

// Função para verificar se o usuário já avaliou o produto
const getExistingRating = async (id_usuario, id_produto) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM avaliacoes WHERE id_usuario = ? AND id_produto = ?', [id_usuario, id_produto], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Função para inserir uma nova avaliação
const insertRating = async (id_usuario, id_produto, avaliacao) => {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO avaliacoes (id_usuario, id_produto, avaliacao) VALUES (?, ?, ?)', [id_usuario, id_produto, avaliacao], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// Função para atualizar uma avaliação existente
const updateRating = async (id_usuario, id_produto, avaliacao) => {
  return new Promise((resolve, reject) => {
    db.run('UPDATE avaliacoes SET avaliacao = ? WHERE id_usuario = ? AND id_produto = ?', [avaliacao, id_usuario, id_produto], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// Rota para adicionar ou atualizar uma avaliação
app.post('/avaliar', async (req, res) => {
  try {
    const { id_usuario, id_produto, avaliacao } = req.body;

    // Verificar se o usuário já avaliou o produto
    const existingRating = await getExistingRating(id_usuario, id_produto);

    if (existingRating) {
      // Se a avaliação já existe, atualize-a
      await updateRating(id_usuario, id_produto, avaliacao);
      return res.status(200).json({ message: 'Avaliação atualizada com sucesso' });
    } else {
      // Se não existir, insira uma nova avaliação
      await insertRating(id_usuario, id_produto, avaliacao);
      return res.status(201).json({ message: 'Avaliação registrada com sucesso' });
    }
  } catch (error) {
    console.error('Erro ao avaliar produto:', error.message);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});


// Rota para obter a média de avaliações de um produto
app.get('/media', async (req, res) => {
  try {
    const { id_produto } = req.query;

    // Consulta o banco de dados para obter as avaliações do produto
    db.all('SELECT avaliacao FROM avaliacoes WHERE id_produto = ?', [id_produto], (err, rows) => {
      if (err) {
        console.error('Erro ao obter avaliações:', err.message);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      // Calcula a média das avaliações
      const totalRatings = rows.length;
      const sumRatings = rows.reduce((sum, row) => sum + row.avaliacao, 0);
      const averageRating = totalRatings > 0 ? sumRatings / totalRatings : 0;

      return res.status(200).json({ media: averageRating });
    });
  } catch (error) {
    console.error('Erro ao obter média:', error.message);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Inicia o servidor na porta especificada
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
