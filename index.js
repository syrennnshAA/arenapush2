import 'dotenv/config';
import fs from 'fs';
import fetch from 'node-fetch';
import delay from 'delay';

const AUTO_DELETE_DELAY = parseInt(process.env.AUTO_DELETE_DELAY_MS || '500');

const bots = Object.entries(process.env)
  .filter(([key]) => key.startsWith('TOKEN'))
  .map(([key, token]) => {
    const n = key.replace('TOKEN', '');
    const channels = process.env['CHANNELS' + n]
      .split(',')
      .map(pair => {
        const [id, d] = pair.split(':');
        return { id: id.trim(), delay: parseInt(d.trim()) };
      });
    return { token, channels };
  });

const getMessageForChannel = (channelId) => {
  const path = `./data/${channelId}.txt`;
  if (!fs.existsSync(path)) return "Pesan default";
  const lines = fs.readFileSync(path, 'utf-8').split('\n').filter(Boolean);
  return lines[Math.floor(Math.random() * lines.length)].trim();
};

const sendMessage = async (token, channelId, content) => {
  try {
    const res = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content, tts: false })
    });

    const json = await res.json();

    if (json.id) {
      console.log(`[+] ${channelId}: ${json.content}`);
      setTimeout(async () => {
        try {
          await fetch(`https://discord.com/api/v9/channels/${channelId}/messages/${json.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': token }
          });
          console.log(`[x] Deleted from ${channelId}: ${json.content}`);
        } catch (err) {
          console.error(`[!] Failed to delete message from ${channelId}:`, err.message);
        }
      }, AUTO_DELETE_DELAY);
    } else {
      console.warn(`[!] Failed to send to ${channelId}:`, json);
    }
  } catch (err) {
    console.error(`[!] Error sending to ${channelId}:`, err.message);
  }
};

bots.forEach(({ token, channels }) => {
  (async () => {
    console.log(`Bot aktif untuk token dengan ${channels.length} channel...`);
    while (true) {
      for (const ch of channels) {
        const message = getMessageForChannel(ch.id);
        await sendMessage(token, ch.id, message);
        await delay(ch.delay);
      }
    }
  })();
});
