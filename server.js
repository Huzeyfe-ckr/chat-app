import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import twig from 'twig';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/index.js';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server);

app.set('views', join(__dirname, 'views'));
app.set('view engine', 'twig');
app.engine('twig', twig.renderFile);
app.use(express.static(join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.render('index.twig');
});

io.on('connection', (socket) => {
  console.log('Un utilisateur connecté');

  // 1. Initialisation du pseudo + récupération / création dans la BDD
  socket.on('set pseudo', async (pseudo, callback) => {
    try {
      // Retrouve l'utilisateur ou le crée s'il n'existe pas
      const user = await prisma.user.upsert({
        where: { pseudo },
        update: {},
        create: { pseudo }
      });

      // Stocke l'id et le pseudo dans la session socket
      socket.data.user = user;

      // Charge l'historique avec les pseudos associés
      const lastMessages = await prisma.message.findMany({
        orderBy: { createdAt: 'asc' },
        take: 50,
        include: { user: true }
      });

      // Renvoie l'historique au client
      socket.emit('chat history', lastMessages);

      if (callback) callback({ success: true, user });
    } catch (err) {
      console.error('Erreur set pseudo:', err);
      if (callback) callback({ success: false });
    }
  });

  // 2. Réception et sauvegarde des nouveaux messages
  socket.on('chat message', async (content) => {
    if (!socket.data.user) return;

    try {
      const savedMessage = await prisma.message.create({
        data: {
          content: content,
          userId: socket.data.user.id
        },
        include: { user: true }
      });

      // Diffuse le message avec le pseudo relié
      io.emit('chat message', {
        pseudo: savedMessage.user.pseudo,
        content: savedMessage.content
      });
    } catch (err) {
      console.error('Erreur sauvegarde message:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Un utilisateur déconnecté');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur en écoute sur http://localhost:${PORT}`);
});