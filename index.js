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
    TextInputStyle,
    SlashCommandBuilder,
    REST,
    Routes
} = require('discord.js');

// ===================== CONFIGURAÇÃO =====================
const CONFIG = {
    CANAL_ACOES_ID: process.env.CANAL_ACOES_ID || '1469953523155341453',
    CANAL_LOG_ID: process.env.CANAL_LOG_ID || '1493252158806818826',
    MAX_PARTICIPANTES: 20,
    CARGO_CRIAR_ACAO: null, // ex: 'Patrulheiro' — deixe null pra liberar pra todo mundo
    COR_ANDAMENTO: '#FF0000',
    COR_FINALIZADA: '#00FF88',
    COR_CANCELADA: '#808080',
    TIPOS: [
        { label: '🏃 Fuga', value: 'Fuga' },
        { label: '💥 Trocação', value: 'Trocação' }
    ]
};

// Categorias de ação com faixa de valor (min/max) de cada local
const CATEGORIAS = {
    pequenas: {
        label: '🏪 Ações Pequenas (Lojas)',
        locais: [
            { value: 'Loja China', min: 123467, max: 143467 },
            { value: 'Lojinha Barragem', min: 123467, max: 143467 },
            { value: 'Lojinha Central', min: 123467, max: 143467 },
            { value: 'Mc Donalds', min: 142533, max: 162533 },
            { value: 'Ammunation Praça', min: 85333, max: 105333 },
            { value: 'Ammunation Porto', min: 85333, max: 105333 },
            { value: 'Barbearia', min: 85333, max: 105333 },
            { value: 'Hiper Mercado', min: 142533, max: 162533 },
            { value: 'Yellow Jack', min: 218800, max: 238800 },
            { value: 'Greapeseed', min: 218800, max: 238800 },
            { value: 'Posto Crispy', min: 218800, max: 238800 },
            { value: 'Mergulhador', min: 218800, max: 238800 },
            { value: 'Bebidas Samir', min: 218800, max: 238800 },
            { value: 'Planet', min: 218800, max: 238800 },
            { value: 'Comedy', min: 218800, max: 238800 }
        ]
    },
    especiais: {
        label: '⭐ Ações Especiais',
        locais: [
            { value: 'Observatório', min: 218800, max: 238800 },
            { value: 'Prefeitura', min: 295067, max: 315067 },
            { value: 'Campo de Golf', min: 371333, max: 391333 },
            { value: 'Mazebank Arena', min: 482800, max: 502800 },
            { value: 'Banco Pine', min: 482800, max: 502800 }
        ]
    },
    medias: {
        label: '💼 Ações Médias',
        locais: [
            { value: 'Pelados', min: 564933, max: 584933 },
            { value: 'Banco Fleeca Lifeinvader', min: 564933, max: 584933 },
            { value: 'Banco Fleeca Praia', min: 564933, max: 584933 },
            { value: 'Banco Fleeca Route 68', min: 564933, max: 584933 },
            { value: 'Banco Fleeca Chaves', min: 564933, max: 584933 },
            { value: 'Banco Fleeca Shopping', min: 564933, max: 584933 },
            { value: 'Porto', min: 647067, max: 667067 },
            { value: 'Açougue', min: 647173, max: 667173 },
            { value: 'Joalheria', min: 647173, max: 667173 },
            { value: 'Galinheiro', min: 647173, max: 667173 },
            { value: 'Roxwood Power', min: 647173, max: 667173 },
            { value: 'Containers', min: 811333, max: 831333 }
        ]
    },
    grandes: {
        label: '🏦 Ações Grandes',
        locais: [
            { value: 'Banco Central', min: 1310000, max: 1330000 },
            { value: 'Banco Paleto', min: 1310000, max: 1330000 },
            { value: 'Banco Central Roxwood', min: 1310000, max: 1330000 },
            { value: 'Niobio', min: 1970000, max: 1990000 }
        ]
    }
};

const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

// Cache em memória: ações ativas (chave = id da mensagem) e dados temporários do formulário (chave = userId)
const acoes = new Map();
const temp = new Map();

// ===================== FUNÇÕES AUXILIARES =====================

function formatarReal(valor) {
    return `R$ ${valor.toLocaleString('pt-BR')}`;
}

function buscarLocal(local) {
    for (const categoria of Object.values(CATEGORIAS)) {
        const item = categoria.locais.find(l => l.value === local);
        if (item) return item;
    }
    return null;
}

function montarListaParticipantes(participantes, maxParticipantes) {
    let lista = participantes.map((id, i) => `${i + 1}. <@${id}>`).join('\n');
    for (let i = participantes.length; i < maxParticipantes; i++) {
        lista += `${lista ? '\n' : ''}${i + 1}. Vaga disponível`;
    }
    return lista || 'Nenhuma vaga cadastrada';
}

function criarEmbedAcao(data, status = 'andamento') {
    const titulos = {
        andamento: '⚔️ AÇÃO EM ANDAMENTO',
        finalizada: '📋 REGISTRO DE AÇÃO',
        cancelada: '🚫 AÇÃO CANCELADA'
    };
    const cores = {
        andamento: CONFIG.COR_ANDAMENTO,
        finalizada: CONFIG.COR_FINALIZADA,
        cancelada: CONFIG.COR_CANCELADA
    };

    const embed = new EmbedBuilder()
        .setTitle(titulos[status])
        .setColor(cores[status])
        .addFields(
            { name: '📍 Local', value: data.local, inline: true },
            { name: '💳 Tipo', value: data.tipo, inline: true },
            { name: '🧍 Refém', value: data.refem === 'SIM' ? 'Sim' : 'Não', inline: true },
            { name: '🎯 Faixa esperada', value: `${formatarReal(data.valorMin)} - ${formatarReal(data.valorMax)}`, inline: true },
            { name: '📅 Data/Hora', value: data.dataHora },
            { name: '👮 Responsável', value: `<@${data.dono}>` }
        )
        .setTimestamp();

    if (status === 'andamento') {
        embed.addFields({
            name: `👥 Escalados (${data.participantes.length}/${data.maxParticipantes})`,
            value: montarListaParticipantes(data.participantes, data.maxParticipantes)
        });
    } else {
        const lista = data.participantes.length
            ? data.participantes.map((id, i) => `${i + 1}. <@${id}>`).join('\n')
            : 'Ninguém participou';
        embed.addFields({ name: '👥 Participantes', value: lista });

        if (status === 'finalizada') {
            embed.addFields({ name: '📊 Resultado', value: data.resultado });

            if (data.valorRecebido != null) {
                embed.addFields({ name: '💰 Valor recebido', value: formatarReal(data.valorRecebido) });

                if (data.valorRecebido < data.valorMin || data.valorRecebido > data.valorMax) {
                    embed.setFooter({ text: '⚠️ Valor informado fora da faixa esperada para essa ação' });
                }
            }
        }
    }

    return embed;
}

async function atualizarMensagemAcao(message, data) {
    const embed = criarEmbedAcao(data, 'andamento');
    await message.edit({ embeds: [embed] }).catch(console.error);
}

async function buscarCanal(guild, canalId) {
    return guild.channels.cache.get(canalId) ?? await guild.channels.fetch(canalId).catch(() => null);
}

function temPermissaoParaCriar(member) {
    if (!CONFIG.CARGO_CRIAR_ACAO) return true;
    return member.roles.cache.some(r => r.name === CONFIG.CARGO_CRIAR_ACAO);
}

// ===================== SLASH COMMANDS =====================

const commands = [
    new SlashCommandBuilder()
        .setName('painel')
        .setDescription('Envia o painel de criação de ações')
].map(c => c.toJSON());

async function registrarSlashCommands() {
    if (!CLIENT_ID || !GUILD_ID) {
        console.log('⚠️ CLIENT_ID ou GUILD_ID ausentes no .env — slash commands não registrados.');
        return;
    }

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    try {
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );
        console.log('✅ Slash Commands registrados');
    } catch (err) {
        console.error('Erro ao registrar slash commands:', err);
    }
}

client.once('ready', async () => {
    console.log(`🤖 Online como ${client.user.tag}`);
    await registrarSlashCommands();
});

// ===================== INTERAÇÕES =====================

client.on('interactionCreate', async (interaction) => {
    try {

        // ---------- COMANDO: /painel ----------
        if (interaction.isChatInputCommand() && interaction.commandName === 'painel') {
            const embed = new EmbedBuilder()
                .setTitle('📋 CENTRAL DE AÇÕES')
                .setDescription('Clique abaixo para criar uma ação.')
                .setColor('#2B2D31');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('criar_acao')
                    .setLabel('➕ Criar Ação')
                    .setStyle(ButtonStyle.Primary)
            );

            return interaction.reply({ embeds: [embed], components: [row] });
        }

        // ---------- BOTÃO: CRIAR AÇÃO ----------
        if (interaction.isButton() && interaction.customId === 'criar_acao') {
            if (!temPermissaoParaCriar(interaction.member)) {
                return interaction.reply({
                    content: `❌ Você precisa do cargo **${CONFIG.CARGO_CRIAR_ACAO}** para criar uma ação.`,
                    ephemeral: true
                });
            }

            const modal = new ModalBuilder()
                .setCustomId('modal_qtd')
                .setTitle('Criar Ação');

            const input = new TextInputBuilder()
                .setCustomId('qtd')
                .setLabel(`Quantidade de pessoas (1-${CONFIG.MAX_PARTICIPANTES})`)
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Ex: 4')
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(input));

            return interaction.showModal(modal);
        }

        // ---------- BOTÃO: WIN (abre modal pedindo o valor recebido) ----------
        if (interaction.isButton() && interaction.customId === 'win') {
            const data = acoes.get(interaction.message.id);

            if (!data) {
                return interaction.reply({ content: '⚠️ Essa ação já foi finalizada ou não existe mais.', ephemeral: true });
            }
            if (interaction.user.id !== data.dono) {
                return interaction.reply({ content: '❌ Só o responsável pode finalizar!', ephemeral: true });
            }

            const modal = new ModalBuilder()
                .setCustomId('modal_valor_win')
                .setTitle('Finalizar Ação - WIN');

            const inputValor = new TextInputBuilder()
                .setCustomId('valor')
                .setLabel(`Valor recebido (faixa: ${formatarReal(data.valorMin)} - ${formatarReal(data.valorMax)})`)
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Ex: 130000')
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(inputValor));

            return interaction.showModal(modal);
        }

        // ---------- BOTÕES DENTRO DE UMA AÇÃO (participar / sair / red / cancelar) ----------
        if (interaction.isButton() && ['participar', 'sair', 'red', 'cancelar'].includes(interaction.customId)) {
            const data = acoes.get(interaction.message.id);

            if (!data) {
                return interaction.reply({
                    content: '⚠️ Essa ação já foi finalizada ou não existe mais.',
                    ephemeral: true
                });
            }

            // PARTICIPAR
            if (interaction.customId === 'participar') {
                if (data.participantes.includes(interaction.user.id)) {
                    return interaction.reply({ content: '❌ Você já está nessa ação!', ephemeral: true });
                }
                if (data.participantes.length >= data.maxParticipantes) {
                    return interaction.reply({ content: '❌ Ação lotada!', ephemeral: true });
                }

                data.participantes.push(interaction.user.id);
                await atualizarMensagemAcao(interaction.message, data);
                return interaction.deferUpdate();
            }

            // SAIR
            if (interaction.customId === 'sair') {
                if (!data.participantes.includes(interaction.user.id)) {
                    return interaction.reply({ content: '❌ Você não está nessa ação.', ephemeral: true });
                }

                data.participantes = data.participantes.filter(id => id !== interaction.user.id);
                await atualizarMensagemAcao(interaction.message, data);
                return interaction.deferUpdate();
            }

            // CANCELAR (só o dono)
            if (interaction.customId === 'cancelar') {
                if (interaction.user.id !== data.dono) {
                    return interaction.reply({ content: '❌ Só o responsável pode cancelar a ação!', ephemeral: true });
                }

                const embedCancelado = criarEmbedAcao(data, 'cancelada');
                await interaction.message.edit({ embeds: [embedCancelado], components: [] });
                acoes.delete(interaction.message.id);
                return interaction.deferUpdate();
            }

            // RED (sem valor — ação fracassada)
            if (interaction.customId === 'red') {
                if (interaction.user.id !== data.dono) {
                    return interaction.reply({ content: '❌ Só o responsável pode finalizar!', ephemeral: true });
                }

                data.resultado = '💀 RED';
                data.valorRecebido = 0;

                const embedFinal = criarEmbedAcao(data, 'finalizada');

                const canalLog = await buscarCanal(interaction.guild, CONFIG.CANAL_LOG_ID);
                if (canalLog) {
                    await canalLog.send({ embeds: [embedFinal] }).catch(console.error);
                } else {
                    console.log('⚠️ Canal de log de ações não encontrado.');
                }

                await interaction.message.edit({
                    content: `Ação finalizada: ${data.resultado}`,
                    embeds: [],
                    components: []
                });

                acoes.delete(interaction.message.id);
                return interaction.deferUpdate();
            }
        }

        // ---------- MODAL: QUANTIDADE ----------
        if (interaction.isModalSubmit() && interaction.customId === 'modal_qtd') {
            const qtdRaw = interaction.fields.getTextInputValue('qtd');
            const qtd = parseInt(qtdRaw, 10);

            if (isNaN(qtd) || qtd <= 0 || qtd > CONFIG.MAX_PARTICIPANTES) {
                return interaction.reply({
                    content: `❌ Quantidade inválida. Use um número entre 1 e ${CONFIG.MAX_PARTICIPANTES}.`,
                    ephemeral: true
                });
            }

            temp.set(interaction.user.id, { maxParticipantes: qtd });

            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select_categoria')
                    .setPlaceholder('Escolha a categoria da ação')
                    .addOptions(
                        Object.entries(CATEGORIAS).map(([key, cat]) => ({
                            label: cat.label,
                            value: key
                        }))
                    )
            );

            return interaction.reply({
                content: '📂 Escolha a categoria da ação:',
                components: [menu],
                ephemeral: true
            });
        }

        // ---------- MODAL: VALOR RECEBIDO (finalizar WIN) ----------
        if (interaction.isModalSubmit() && interaction.customId === 'modal_valor_win') {
            if (!interaction.isFromMessage() || !interaction.message) {
                return interaction.reply({ content: '❌ Não foi possível localizar a ação original.', ephemeral: true });
            }

            const data = acoes.get(interaction.message.id);
            if (!data) {
                return interaction.reply({ content: '⚠️ Essa ação já foi finalizada ou não existe mais.', ephemeral: true });
            }

            const valorRaw = interaction.fields.getTextInputValue('valor');
            const valor = parseInt(valorRaw.replace(/\D/g, ''), 10);

            if (isNaN(valor) || valor <= 0) {
                return interaction.reply({ content: '❌ Valor inválido. Digite apenas números (ex: 130000).', ephemeral: true });
            }

            data.resultado = '🏆 WIN';
            data.valorRecebido = valor;

            const embedFinal = criarEmbedAcao(data, 'finalizada');

            const canalLog = await buscarCanal(interaction.guild, CONFIG.CANAL_LOG_ID);
            if (canalLog) {
                await canalLog.send({ embeds: [embedFinal] }).catch(console.error);
            } else {
                console.log('⚠️ Canal de log de ações não encontrado.');
            }

            await interaction.update({
                content: `Ação finalizada: ${data.resultado} — ${formatarReal(valor)}`,
                embeds: [],
                components: []
            });

            acoes.delete(interaction.message.id);
            return;
        }

        // ---------- MENUS: CATEGORIA / LOCAL / TIPO / REFÉM ----------
        if (interaction.isStringSelectMenu()) {
            const dadosTemp = temp.get(interaction.user.id);

            if (!dadosTemp) {
                return interaction.update({
                    content: '⚠️ Sua sessão expirou. Clique em "Criar Ação" novamente.',
                    components: []
                });
            }

            if (interaction.customId === 'select_categoria') {
                const categoriaKey = interaction.values[0];
                dadosTemp.categoria = categoriaKey;

                const menu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('select_local')
                        .setPlaceholder('Escolha o local')
                        .addOptions(
                            CATEGORIAS[categoriaKey].locais.map(l => ({
                                label: l.value,
                                description: `${formatarReal(l.min)} - ${formatarReal(l.max)}`,
                                value: l.value
                            }))
                        )
                );

                return interaction.update({
                    content: `📂 Categoria: **${CATEGORIAS[categoriaKey].label}**\n📍 Agora escolha o local:`,
                    components: [menu]
                });
            }

            if (interaction.customId === 'select_local') {
                const localInfo = buscarLocal(interaction.values[0]);

                dadosTemp.local = localInfo.value;
                dadosTemp.valorMin = localInfo.min;
                dadosTemp.valorMax = localInfo.max;

                const menu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('select_tipo')
                        .setPlaceholder('Tipo')
                        .addOptions(CONFIG.TIPOS)
                );

                return interaction.update({ content: '💳 Escolha o tipo:', components: [menu] });
            }

            if (interaction.customId === 'select_tipo') {
                dadosTemp.tipo = interaction.values[0];

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
                dadosTemp.refem = interaction.values[0];

                const canal = await buscarCanal(interaction.guild, CONFIG.CANAL_ACOES_ID);
                if (!canal) {
                    temp.delete(interaction.user.id);
                    return interaction.update({
                        content: '❌ Canal de ações não encontrado. Avise um administrador.',
                        components: []
                    });
                }

                const dataHora = new Date().toLocaleString('pt-BR');

                const data = {
                    dono: interaction.user.id,
                    local: dadosTemp.local,
                    valorMin: dadosTemp.valorMin,
                    valorMax: dadosTemp.valorMax,
                    tipo: dadosTemp.tipo,
                    refem: dadosTemp.refem,
                    maxParticipantes: dadosTemp.maxParticipantes,
                    participantes: [],
                    dataHora
                };

                const embed = criarEmbedAcao(data, 'andamento');

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('participar').setLabel('🔫 Participar').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('sair').setLabel('🚪 Sair').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('win').setLabel('🏆 Win').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('red').setLabel('💀 Red').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('cancelar').setLabel('🚫 Cancelar').setStyle(ButtonStyle.Secondary)
                );

                const msg = await canal.send({ embeds: [embed], components: [row] });

                acoes.set(msg.id, data);
                temp.delete(interaction.user.id);

                return interaction.update({ content: '✅ Ação criada!', components: [] });
            }
        }

    } catch (err) {
        console.error('Erro no interactionCreate:', err);
        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
            interaction.reply({ content: '❌ Ocorreu um erro inesperado. Tente novamente.', ephemeral: true }).catch(() => null);
        }
    }
});

client.login(process.env.TOKEN);
