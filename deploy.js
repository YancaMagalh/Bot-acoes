require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [

  new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Criar painel de ações'),

  new SlashCommandBuilder()
    .setName('finalizar')
    .setDescription('Finalizar ação')
    .addStringOption(o =>
      o.setName('resultado')
        .setDescription('Resultado')
        .addChoices(
          { name: 'WIN', value: 'win' },
          { name: 'RED', value: 'red' }
        )
        .setRequired(true))

].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

rest.put(
  Routes.applicationGuildCommands('1492993316076392601', '1469406162662195272'),
  { body: commands }
).then(() => console.log('Comandos registrados!'));