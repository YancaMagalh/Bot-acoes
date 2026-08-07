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

    // Exemplo: 'Patrulheiro'
    // Deixe null para liberar para todos
    CARGO_CRIAR_ACAO: null,

    COR_ANDAMENTO: '#FF0000',
    COR_FINALIZADA: '#00FF88',
    COR_CANCELADA: '#808080',

    TIPOS: [
        { label: '🏃 Fuga', value: 'Fuga' },
        { label: '💥 Trocação', value: 'Trocação' }
    ]
};

// ===================== CATEGORIAS =====================

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

// ===================== CLIENTE =====================

const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

// ===================== CACHE =====================

const acoes = new Map();
const temp = new Map();

// ===================== FUNÇÕES AUXILIARES =====================

function formatarReal(valor) {
    return `R$ ${valor.toLocaleString('pt-BR')}`;
}

function buscarLocal(local) {
    for (const categoria of Object.values(CATEGORIAS)) {
        const item = categoria.locais.find(l => l.value === local);

        if (item) {
            return item;
        }
    }

    return null;
}

function montarListaParticipantes(participantes, maxParticipantes) {
    let lista = participantes
        .map((id, i) => `${i + 1}. <@${id}>`)
        .join('\n');

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
        .setDescription(
            `## ⏰ AÇÃO ÀS ${data.horario}\n` +
            `📅 **${data.data}**`
        )
        .addFields(
            {
                name: '📍 Local',
                value: data.local,
                inline: true
            },
            {
                name: '💳 Tipo',
                value: data.tipo,
                inline: true
            },
            {
                name: '🧍 Refém',
                value: data.refem === 'SIM' ? 'Sim' : 'Não',
                inline: true
            },
            {
                name: '🎯 Faixa esperada',
                value: `${formatarReal(data.valorMin)} - ${formatarReal(data.valorMax)}`,
                inline: false
            },
            {
                name: '👮 Responsável',
                value: `<@${data.dono}>`,
                inline: true
            }
        )
        .setTimestamp();

    // =====================
    // EM ANDAMENTO
    // =====================

    if (status === 'andamento') {
        const faltam =
            data.maxParticipantes -
            data.participantes.length;

        let textoParticipantes =
            montarListaParticipantes(
                data.participantes,
                data.maxParticipantes
            );

        if (faltam > 0) {
            textoParticipantes +=
                `\n\n⚠️ **Faltam ${faltam} pessoa(s) para completar a ação.**`;
        } else {
            textoParticipantes +=
                '\n\n✅ **CONTINGENTE COMPLETO!**';
        }

        embed.addFields({
            name:
                `👥 Escalados (${data.participantes.length}/${data.maxParticipantes})`,
            value: textoParticipantes
        });
    }

    // =====================
    // FINALIZADA / CANCELADA
    // =====================

    else {
        const listaParticipantes =
            data.participantes.length
                ? data.participantes
                    .map((id, i) => `${i + 1}. <@${id}>`)
                    .join('\n')
                : 'Ninguém participou';

        embed.addFields({
            name: '👥 Participantes',
            value: listaParticipantes
        });

        if (status === 'finalizada') {
            embed.addFields({
                name: '📊 Resultado',
                value: data.resultado
            });

            if (data.valorRecebido != null) {
                embed.addFields({
                    name: '💰 Valor recebido',
                    value: formatarReal(data.valorRecebido)
                });

                if (
                    data.valorRecebido < data.valorMin ||
                    data.valorRecebido > data.valorMax
                ) {
                    embed.setFooter({
                        text:
                            '⚠️ Valor informado fora da faixa esperada para essa ação'
                    });
                }
            }
        }
    }

    return embed;
}

async function atualizarMensagemAcao(message, data) {
    const embed = criarEmbedAcao(data, 'andamento');

    await message.edit({
        embeds: [embed]
    }).catch(console.error);
}

async function buscarCanal(guild, canalId) {
    return (
        guild.channels.cache.get(canalId) ??
        await guild.channels.fetch(canalId).catch(() => null)
    );
}

function temPermissaoParaCriar(member) {
    if (!CONFIG.CARGO_CRIAR_ACAO) {
        return true;
    }

    return member.roles.cache.some(
        r => r.name === CONFIG.CARGO_CRIAR_ACAO
    );
}

// ===================== SLASH COMMANDS =====================

const commands = [
    new SlashCommandBuilder()
        .setName('painel')
        .setDescription('Envia o painel de criação de ações')
].map(command => command.toJSON());

async function registrarSlashCommands() {
    if (!CLIENT_ID || !GUILD_ID) {
        console.log(
            '⚠️ CLIENT_ID ou GUILD_ID ausentes no .env — slash commands não registrados.'
        );

        return;
    }

    const rest = new REST({
        version: '10'
    }).setToken(process.env.TOKEN);

    try {
        await rest.put(
            Routes.applicationGuildCommands(
                CLIENT_ID,
                GUILD_ID
            ),
            {
                body: commands
            }
        );

        console.log('✅ Slash Commands registrados');
    } catch (err) {
        console.error(
            'Erro ao registrar slash commands:',
            err
        );
    }
}

// ===================== READY =====================

client.once('ready', async () => {
    console.log(
        `🤖 Online como ${client.user.tag}`
    );

    await registrarSlashCommands();
});

// ===================== INTERAÇÕES =====================

client.on('interactionCreate', async interaction => {
    try {

        // ==========================================
        // /painel
        // ==========================================

        if (
            interaction.isChatInputCommand() &&
            interaction.commandName === 'painel'
        ) {
            const embed = new EmbedBuilder()
                .setTitle('📋 CENTRAL DE AÇÕES')
                .setDescription(
                    'Clique abaixo para criar uma ação.'
                )
                .setColor('#2B2D31');

            const row =
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('criar_acao')
                            .setLabel('➕ Criar Ação')
                            .setStyle(ButtonStyle.Primary)
                    );

            return interaction.reply({
                embeds: [embed],
                components: [row]
            });
        }

        // ==========================================
        // BOTÃO CRIAR AÇÃO
        // ==========================================

        if (
            interaction.isButton() &&
            interaction.customId === 'criar_acao'
        ) {
            if (
                !temPermissaoParaCriar(
                    interaction.member
                )
            ) {
                return interaction.reply({
                    content:
                        `❌ Você precisa do cargo **${CONFIG.CARGO_CRIAR_ACAO}** para criar uma ação.`,
                    ephemeral: true
                });
            }

            const modal =
                new ModalBuilder()
                    .setCustomId('modal_qtd')
                    .setTitle('Criar Ação');

            const inputQtd =
                new TextInputBuilder()
                    .setCustomId('qtd')
                    .setLabel(
                        `Quantidade de pessoas (1-${CONFIG.MAX_PARTICIPANTES})`
                    )
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ex: 6')
                    .setRequired(true);

            const inputHorario =
                new TextInputBuilder()
                    .setCustomId('horario')
                    .setLabel('Horário da ação')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ex: 21:30')
                    .setMaxLength(5)
                    .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(inputQtd),

                new ActionRowBuilder()
                    .addComponents(inputHorario)
            );

            return interaction.showModal(modal);
        }

        // ==========================================
        // BOTÃO WIN
        // ==========================================

        if (
            interaction.isButton() &&
            interaction.customId === 'win'
        ) {
            const data =
                acoes.get(
                    interaction.message.id
                );

            if (!data) {
                return interaction.reply({
                    content:
                        '⚠️ Essa ação já foi finalizada ou não existe mais.',
                    ephemeral: true
                });
            }

            if (
                interaction.user.id !==
                data.dono
            ) {
                return interaction.reply({
                    content:
                        '❌ Só o responsável pode finalizar!',
                    ephemeral: true
                });
            }

            const modal =
                new ModalBuilder()
                    .setCustomId('modal_valor_win')
                    .setTitle('Finalizar Ação - WIN');

            const inputValor =
                new TextInputBuilder()
                    .setCustomId('valor')
                    .setLabel('Valor recebido')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder(
                        `Ex: ${data.valorMin}`
                    )
                    .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(inputValor)
            );

            return interaction.showModal(modal);
        }

        // ==========================================
        // BOTÕES DA AÇÃO
        // ==========================================

        if (
            interaction.isButton() &&
            [
                'participar',
                'sair',
                'red',
                'cancelar',
                'sem_contingente'
            ].includes(interaction.customId)
        ) {
            const data =
                acoes.get(
                    interaction.message.id
                );

            if (!data) {
                return interaction.reply({
                    content:
                        '⚠️ Essa ação já foi finalizada ou não existe mais.',
                    ephemeral: true
                });
            }

            // PARTICIPAR
            if (
                interaction.customId ===
                'participar'
            ) {
                if (
                    data.participantes.includes(
                        interaction.user.id
                    )
                ) {
                    return interaction.reply({
                        content:
                            '❌ Você já está nessa ação!',
                        ephemeral: true
                    });
                }

                if (
                    data.participantes.length >=
                    data.maxParticipantes
                ) {
                    return interaction.reply({
                        content:
                            '❌ Ação lotada!',
                        ephemeral: true
                    });
                }

                data.participantes.push(
                    interaction.user.id
                );

                await interaction.deferUpdate();

                await atualizarMensagemAcao(
                    interaction.message,
                    data
                );

                return;
            }

            // SAIR
            if (
                interaction.customId ===
                'sair'
            ) {
                if (
                    !data.participantes.includes(
                        interaction.user.id
                    )
                ) {
                    return interaction.reply({
                        content:
                            '❌ Você não está nessa ação.',
                        ephemeral: true
                    });
                }

                data.participantes =
                    data.participantes.filter(
                        id =>
                            id !==
                            interaction.user.id
                    );

                await interaction.deferUpdate();

                await atualizarMensagemAcao(
                    interaction.message,
                    data
                );

                return;
            }

            // CANCELAR
            if (
                interaction.customId ===
                'cancelar'
            ) {
                if (
                    interaction.user.id !==
                    data.dono
                ) {
                    return interaction.reply({
                        content:
                            '❌ Só o responsável pode cancelar a ação!',
                        ephemeral: true
                    });
                }

                const embedCancelado =
                    criarEmbedAcao(
                        data,
                        'cancelada'
                    );

                embedCancelado.addFields({
                    name:
                        '🚫 Motivo do cancelamento',
                    value:
                        'Cancelada pelo responsável.'
                });

                const canalLog =
                    await buscarCanal(
                        interaction.guild,
                        CONFIG.CANAL_LOG_ID
                    );

                if (canalLog) {
                    await canalLog.send({
                        embeds: [embedCancelado]
                    }).catch(console.error);
                }

                await interaction.deferUpdate();

                await interaction.message.edit({
                    content:
                        '🚫 Ação cancelada pelo responsável.',
                    embeds: [],
                    components: []
                });

                acoes.delete(
                    interaction.message.id
                );

                return;
            }

            // SEM CONTINGENTE
            if (
                interaction.customId ===
                'sem_contingente'
            ) {
                if (
                    interaction.user.id !==
                    data.dono
                ) {
                    return interaction.reply({
                        content:
                            '❌ Só o responsável pode cancelar por falta de contingente!',
                        ephemeral: true
                    });
                }

                const faltaram =
                    Math.max(
                        data.maxParticipantes -
                        data.participantes.length,
                        0
                    );

                const embedCancelado =
                    criarEmbedAcao(
                        data,
                        'cancelada'
                    );

                embedCancelado
                    .setTitle(
                        '👥 AÇÃO CANCELADA — SEM CONTINGENTE'
                    )
                    .addFields({
                        name:
                            '⚠️ Motivo do cancelamento',
                        value:
                            `A ação não atingiu o contingente necessário.\n\n` +
                            `👥 **Presentes:** ${data.participantes.length}/${data.maxParticipantes}\n` +
                            `❌ **Faltaram:** ${faltaram} pessoa(s)`
                    });

                const canalLog =
                    await buscarCanal(
                        interaction.guild,
                        CONFIG.CANAL_LOG_ID
                    );

                if (canalLog) {
                    await canalLog.send({
                        embeds: [embedCancelado]
                    }).catch(console.error);
                }

                await interaction.deferUpdate();

                await interaction.message.edit({
                    content:
                        `👥 Ação cancelada por falta de contingente — ${data.participantes.length}/${data.maxParticipantes} participantes.`,
                    embeds: [],
                    components: []
                });

                acoes.delete(
                    interaction.message.id
                );

                return;
            }

            // RED
            if (
                interaction.customId ===
                'red'
            ) {
                if (
                    interaction.user.id !==
                    data.dono
                ) {
                    return interaction.reply({
                        content:
                            '❌ Só o responsável pode finalizar!',
                        ephemeral: true
                    });
                }

                data.resultado =
                    '💀 RED';

                data.valorRecebido = 0;

                const embedFinal =
                    criarEmbedAcao(
                        data,
                        'finalizada'
                    );

                const canalLog =
                    await buscarCanal(
                        interaction.guild,
                        CONFIG.CANAL_LOG_ID
                    );

                if (canalLog) {
                    await canalLog.send({
                        embeds: [embedFinal]
                    }).catch(console.error);
                }

                await interaction.deferUpdate();

                await interaction.message.edit({
                    content:
                        `Ação finalizada: ${data.resultado}`,
                    embeds: [],
                    components: []
                });

                acoes.delete(
                    interaction.message.id
                );

                return;
            }
        }

        // ==========================================
        // MODAL QUANTIDADE + HORÁRIO
        // ==========================================

        if (
            interaction.isModalSubmit() &&
            interaction.customId ===
            'modal_qtd'
        ) {
            const qtdRaw =
                interaction.fields
                    .getTextInputValue('qtd');

            const horarioRaw =
                interaction.fields
                    .getTextInputValue('horario')
                    .trim();

            const qtd =
                parseInt(qtdRaw, 10);

            if (
                isNaN(qtd) ||
                qtd <= 0 ||
                qtd > CONFIG.MAX_PARTICIPANTES
            ) {
                return interaction.reply({
                    content:
                        `❌ Quantidade inválida. Use um número entre 1 e ${CONFIG.MAX_PARTICIPANTES}.`,
                    ephemeral: true
                });
            }

            // FORMATO HH:MM
            const horarioRegex =
                /^([01]\d|2[0-3]):([0-5]\d)$/;

            if (
                !horarioRegex.test(
                    horarioRaw
                )
            ) {
                return interaction.reply({
                    content:
                        '❌ Horário inválido. Digite no formato **HH:MM**. Exemplo: `21:30`.',
                    ephemeral: true
                });
            }

            temp.set(
                interaction.user.id,
                {
                    maxParticipantes: qtd,
                    horario: horarioRaw
                }
            );

            const menu =
                new ActionRowBuilder()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId(
                                'select_categoria'
                            )
                            .setPlaceholder(
                                'Escolha a categoria da ação'
                            )
                            .addOptions(
                                Object.entries(
                                    CATEGORIAS
                                ).map(
                                    ([key, cat]) => ({
                                        label:
                                            cat.label,
                                        value:
                                            key
                                    })
                                )
                            )
                    );

            return interaction.reply({
                content:
                    `⏰ Horário da ação: **${horarioRaw}**\n\n` +
                    '📂 Agora escolha a categoria da ação:',
                components: [menu],
                ephemeral: true
            });
        }

        // ==========================================
        // MODAL VALOR WIN
        // ==========================================

        if (
            interaction.isModalSubmit() &&
            interaction.customId ===
            'modal_valor_win'
        ) {
            if (!interaction.message) {
                return interaction.reply({
                    content:
                        '❌ Não foi possível localizar a ação original.',
                    ephemeral: true
                });
            }

            const data =
                acoes.get(
                    interaction.message.id
                );

            if (!data) {
                return interaction.reply({
                    content:
                        '⚠️ Essa ação já foi finalizada ou não existe mais.',
                    ephemeral: true
                });
            }

            const valorRaw =
                interaction.fields
                    .getTextInputValue('valor');

            const valor =
                parseInt(
                    valorRaw.replace(
                        /\D/g,
                        ''
                    ),
                    10
                );

            if (
                isNaN(valor) ||
                valor <= 0
            ) {
                return interaction.reply({
                    content:
                        '❌ Valor inválido. Digite apenas números. Ex: 130000.',
                    ephemeral: true
                });
            }

            data.resultado =
                '🏆 WIN';

            data.valorRecebido =
                valor;

            const embedFinal =
                criarEmbedAcao(
                    data,
                    'finalizada'
                );

            const canalLog =
                await buscarCanal(
                    interaction.guild,
                    CONFIG.CANAL_LOG_ID
                );

            if (canalLog) {
                await canalLog.send({
                    embeds: [embedFinal]
                }).catch(console.error);
            }

            await interaction.update({
                content:
                    `Ação finalizada: ${data.resultado} — ${formatarReal(valor)}`,
                embeds: [],
                components: []
            });

            acoes.delete(
                interaction.message.id
            );

            return;
        }

        // ==========================================
        // MENUS
        // ==========================================

        if (
            interaction.isStringSelectMenu()
        ) {
            const dadosTemp =
                temp.get(
                    interaction.user.id
                );

            if (!dadosTemp) {
                return interaction.update({
                    content:
                        '⚠️ Sua sessão expirou. Clique em "Criar Ação" novamente.',
                    components: []
                });
            }

            // CATEGORIA
            if (
                interaction.customId ===
                'select_categoria'
            ) {
                const categoriaKey =
                    interaction.values[0];

                dadosTemp.categoria =
                    categoriaKey;

                const categoria =
                    CATEGORIAS[
                        categoriaKey
                    ];

                if (!categoria) {
                    return interaction.update({
                        content:
                            '❌ Categoria inválida.',
                        components: []
                    });
                }

                const menu =
                    new ActionRowBuilder()
                        .addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId(
                                    'select_local'
                                )
                                .setPlaceholder(
                                    'Escolha o local'
                                )
                                .addOptions(
                                    categoria.locais
                                        .map(
                                            local => ({
                                                label:
                                                    local.value,
                                                description:
                                                    `${formatarReal(local.min)} - ${formatarReal(local.max)}`,
                                                value:
                                                    local.value
                                            })
                                        )
                                )
                        );

                return interaction.update({
                    content:
                        `📂 Categoria: **${categoria.label}**\n` +
                        '📍 Agora escolha o local:',
                    components: [menu]
                });
            }

            // LOCAL
            if (
                interaction.customId ===
                'select_local'
            ) {
                const localInfo =
                    buscarLocal(
                        interaction.values[0]
                    );

                if (!localInfo) {
                    return interaction.update({
                        content:
                            '❌ Local não encontrado.',
                        components: []
                    });
                }

                dadosTemp.local =
                    localInfo.value;

                dadosTemp.valorMin =
                    localInfo.min;

                dadosTemp.valorMax =
                    localInfo.max;

                const menu =
                    new ActionRowBuilder()
                        .addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId(
                                    'select_tipo'
                                )
                                .setPlaceholder(
                                    'Escolha o tipo'
                                )
                                .addOptions(
                                    CONFIG.TIPOS
                                )
                        );

                return interaction.update({
                    content:
                        `📍 Local: **${localInfo.value}**\n\n` +
                        '💳 Escolha o tipo da ação:',
                    components: [menu]
                });
            }

            // TIPO
            if (
                interaction.customId ===
                'select_tipo'
            ) {
                dadosTemp.tipo =
                    interaction.values[0];

                const menu =
                    new ActionRowBuilder()
                        .addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId(
                                    'select_refem'
                                )
                                .setPlaceholder(
                                    'Refém?'
                                )
                                .addOptions([
                                    {
                                        label:
                                            'Sim',
                                        value:
                                            'SIM'
                                    },
                                    {
                                        label:
                                            'Não',
                                        value:
                                            'NAO'
                                    }
                                ])
                        );

                return interaction.update({
                    content:
                        '🧍 A ação possui refém?',
                    components: [menu]
                });
            }

            // REFÉM
            if (
                interaction.customId ===
                'select_refem'
            ) {
                dadosTemp.refem =
                    interaction.values[0];

                const canal =
                    await buscarCanal(
                        interaction.guild,
                        CONFIG.CANAL_ACOES_ID
                    );

                if (!canal) {
                    temp.delete(
                        interaction.user.id
                    );

                    return interaction.update({
                        content:
                            '❌ Canal de ações não encontrado. Avise um administrador.',
                        components: []
                    });
                }

                const agora =
                    new Date();

                const dataAtual =
                    agora.toLocaleDateString(
                        'pt-BR',
                        {
                            timeZone:
                                'America/Sao_Paulo'
                        }
                    );

                const dadosAcao = {
                    dono:
                        interaction.user.id,

                    local:
                        dadosTemp.local,

                    valorMin:
                        dadosTemp.valorMin,

                    valorMax:
                        dadosTemp.valorMax,

                    tipo:
                        dadosTemp.tipo,

                    refem:
                        dadosTemp.refem,

                    maxParticipantes:
                        dadosTemp.maxParticipantes,

                    participantes: [],

                    data:
                        dataAtual,

                    // HORÁRIO DIGITADO POR VOCÊ
                    horario:
                        dadosTemp.horario
                };

                const embed =
                    criarEmbedAcao(
                        dadosAcao,
                        'andamento'
                    );

                const row1 =
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(
                                    'participar'
                                )
                                .setLabel(
                                    '🔫 Participar'
                                )
                                .setStyle(
                                    ButtonStyle.Success
                                ),

                            new ButtonBuilder()
                                .setCustomId(
                                    'sair'
                                )
                                .setLabel(
                                    '🚪 Sair'
                                )
                                .setStyle(
                                    ButtonStyle.Secondary
                                ),

                            new ButtonBuilder()
                                .setCustomId(
                                    'win'
                                )
                                .setLabel(
                                    '🏆 Win'
                                )
                                .setStyle(
                                    ButtonStyle.Primary
                                ),

                            new ButtonBuilder()
                                .setCustomId(
                                    'red'
                                )
                                .setLabel(
                                    '💀 Red'
                                )
                                .setStyle(
                                    ButtonStyle.Danger
                                ),

                            new ButtonBuilder()
                                .setCustomId(
                                    'cancelar'
                                )
                                .setLabel(
                                    '🚫 Cancelar'
                                )
                                .setStyle(
                                    ButtonStyle.Secondary
                                )
                        );

                const row2 =
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(
                                    'sem_contingente'
                                )
                                .setLabel(
                                    '👥 Sem contingente'
                                )
                                .setStyle(
                                    ButtonStyle.Secondary
                                )
                        );

                const msg =
                    await canal.send({
                        embeds: [embed],
                        components: [
                            row1,
                            row2
                        ]
                    });

                acoes.set(
                    msg.id,
                    dadosAcao
                );

                temp.delete(
                    interaction.user.id
                );

                return interaction.update({
                    content:
                        `✅ Ação criada para **${dadosTemp.horario}**!`,
                    components: []
                });
            }
        }

    } catch (err) {
        console.error(
            'Erro no interactionCreate:',
            err
        );

        if (
            interaction.isRepliable() &&
            !interaction.replied &&
            !interaction.deferred
        ) {
            interaction.reply({
                content:
                    '❌ Ocorreu um erro inesperado. Tente novamente.',
                ephemeral: true
            }).catch(() => null);
        }
    }
});

// ===================== LOGIN =====================

client.login(process.env.TOKEN);
