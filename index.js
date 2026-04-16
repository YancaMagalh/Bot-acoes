require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

// CONFIG
const CANAL_ACOES = '1469953523155341453';
const LOG_FINAL = '1493252158806818826';

let acoes = {};
let temp = {};

client.once('ready', () => {
  console.log(`🤖 Online como ${client.user.tag}`);
});

// ======================
// INTERAÇÕES
// ======================

client.on('interactionCreate', async interaction => {

  // ===== COMANDOS =====
  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === 'painel') {

      const embed = new EmbedBuilder()
        .setTitle('📋 CENTRAL DE AÇÕES')
        .setDescription('Clique abaixo para criar uma ação')
        .setColor('#2b2d31');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('criar_acao')
          .setLabel('➕ Criar Ação')
          .setStyle(ButtonStyle.Primary)
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }
  }

  // ===== BOTÕES =====
  if (interaction.isButton()) {

    // CRIAR AÇÃO
    if (interaction.customId === 'criar_acao') {

      const modal = new ModalBuilder()
        .setCustomId('modal_qtd')
        .setTitle('Criar Ação');

      const input = new TextInputBuilder()
        .setCustomId('qtd')
        .setLabel('Quantidade de pessoas')
        .setStyle(TextInputStyle.Short);

      modal.addComponents(new ActionRowBuilder().addComponents(input));

      return interaction.showModal(modal);
    }

    const data = acoes[interaction.message.id];
    if (!data) return;

    // PARTICIPAR
    if (interaction.customId === 'participar') {

      if (data.participantes.includes(interaction.user.id)) {
        return interaction.reply({ content: 'Você já está na ação!', ephemeral: true });
      }

      if (data.participantes.length >= data.max) {
        return interaction.reply({ content: 'Ação lotada!', ephemeral: true });
      }

      data.participantes.push(interaction.user.id);
      atualizar(interaction.message, data);

      return interaction.deferUpdate();
    }

    // FINALIZAR
    if (interaction.customId === 'win' || interaction.customId === 'red') {

      if (interaction.user.id !== data.dono) {
        return interaction.reply({
          content: 'Só o responsável pode finalizar!',
          ephemeral: true
        });
      }

      const resultado = interaction.customId === 'win' ? '🏆 WIN' : '💀 RED';

      const lista = data.participantes.map((id, i) => `${i + 1}. <@${id}>`).join('\n') || 'Ninguém';

      const embedFinal = new EmbedBuilder()
        .setTitle('📋 REGISTRO DE AÇÃO')
        .setColor('#00ff88')
        .addOptions([
  { label: '🏦 Banco Central', value: 'Banco Central' },
  { label: '🏪 Fleeca', value: 'Fleeca' },
  { label: '💎 Joalheria', value: 'Joalheria' },
  { label: '🛒 Lojinha', value: 'Lojinha' },
  { label: '🔫 Ammunation', value: 'Ammunation' },
  { label: '🐔 Galinheiro', value: 'Galinheiro' },
  { label: '🥩 Açougue', value: 'Acougue' },
{ label: '🏦 Niobio', value: 'Niobio' }
])

      interaction.guild.channels.cache.get(LOG_FINAL).send({ embeds: [embedFinal] });

      await interaction.message.edit({
        content: `Finalizada: ${resultado}`,
        embeds: [],
        components: []
      });

      delete acoes[interaction.message.id];

      return interaction.deferUpdate();
    }
  }

  // ===== MODAL =====
  if (interaction.isModalSubmit()) {

    if (interaction.customId === 'modal_qtd') {

      const qtd = parseInt(interaction.fields.getTextInputValue('qtd'));

      temp[interaction.user.id] = { max: qtd };

      const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('select_local')
          .setPlaceholder('Escolha o local')
          .addOptions([
  { label: '🏦 Banco Central', value: 'Banco Central' },
  { label: '🏪 Fleeca', value: 'Fleeca' },
  { label: '💎 Joalheria', value: 'Joalheria' },
  { label: '🛒 Lojinha', value: 'Lojinha' },
  { label: '🔫 Ammunation', value: 'Ammunation' },
  { label: '🐔 Galinheiro', value: 'Galinheiro' },
  { label: '🥩 Açougue', value: 'Acougue' }
  { label: '🏦 Niobio', value: 'Niobio' }
]),
      );

      return interaction.reply({
        content: '📍 Escolha o local:',
        components: [menu],
        ephemeral: true
      });
    }
  }

  // ===== MENUS =====
  if (interaction.isStringSelectMenu()) {

    if (interaction.customId === 'select_local') {
      temp[interaction.user.id].local = interaction.values[0];

      const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('select_tipo')
          .setPlaceholder('Tipo')
          .addOptions([
            { label: '🏃 Fuga', value: 'Fuga' },
            { label: '💥 Trocação', value: 'Trocação' }
          ])
      );

      return interaction.update({ content: '💳 Escolha o tipo:', components: [menu] });
    }

    if (interaction.customId === 'select_tipo') {
      temp[interaction.user.id].tipo = interaction.values[0];

      const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('select_refem')
          .setPlaceholder('Refém?')
          .addOptions([
            { label: 'Sim', value: 'SIM' },
            { label: 'Não', value: 'NAO' }
          ])
      );

      return interaction.update({ content: '🧍 Tem refém?', components: [menu] });
    }

    if (interaction.customId === 'select_refem') {

      const data = temp[interaction.user.id];
      data.refem = interaction.values[0];

      const canal = interaction.guild.channels.cache.get(CANAL_ACOES);

      const dataHora = new Date().toLocaleString('pt-BR');

      const embed = new EmbedBuilder()
        .setTitle('⚔️ AÇÃO EM ANDAMENTO')
        .setColor('#ff0000')
        .addFields(
          { name: '📍 Local', value: data.local },
          { name: '📅 Data/Hora', value: dataHora },
          { name: '💳 Tipo', value: data.tipo },
          { name: '🧍 Refém', value: data.refem },
          { name: '👮 Responsável', value: `<@${interaction.user.id}>` },
          { name: `👥 Escalados (0/${data.max})`, value: '1. Vaga disponível' }
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('participar')
          .setLabel('🔫 Participar')
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId('win')
          .setLabel('🏆 Win')
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId('red')
          .setLabel('💀 Red')
          .setStyle(ButtonStyle.Danger)
      );

      const msg = await canal.send({
        embeds: [embed],
        components: [row]
      });

      acoes[msg.id] = {
        dono: interaction.user.id,
        ...data,
        participantes: [],
        canalId: canal.id,
        dataHora
      };

      delete temp[interaction.user.id];

      return interaction.update({ content: '✅ Ação criada!', components: [] });
    }
  }
});

// ======================
// ATUALIZAÇÃO
// ======================

async function atualizar(message, data) {

  let lista = '';

  data.participantes.forEach((id, i) => {
    lista += `${i + 1}. <@${id}>\n`;
  });

  for (let i = data.participantes.length; i < data.max; i++) {
    lista += `${i + 1}. Vaga disponível\n`;
  }

  const embed = new EmbedBuilder()
    .setTitle('⚔️ AÇÃO EM ANDAMENTO')
    .setColor('#ff0000')
    .addFields(
      { name: '📍 Local', value: data.local },
      { name: '📅 Data/Hora', value: data.dataHora },
      { name: '💳 Tipo', value: data.tipo },
      { name: '🧍 Refém', value: data.refem },
      { name: '👮 Responsável', value: `<@${data.dono}>` },
      { name: `👥 Escalados (${data.participantes.length}/${data.max})`, value: lista }
    );

  await message.edit({ embeds: [embed] });
}

client.login(process.env.TOKEN);