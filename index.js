require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  AuditLogEvent,
  PermissionFlagsBits,
  ActivityType,
  ChannelType,
  Collection
} = require('discord.js');

// ===================== CONFIGURATION =====================
// Varsayılan yapılandırma
const DEFAULT_CONFIG = {
  prefix: '!',
  ownerID: '987664359285219348', // Owner ID
  logChannel: '1413509831645462668', // Log channel ID
  
  
  inviteBlock: true,
  dangerousRoleGuard: true,
  botAddProtection: true,
  boosterProtection: true,
  vanityProtection: true,
  webhookProtection: true,
  spamProtection: true,
  profanityFilter: true,
  linkBlock: true,
  
  // Limits
  channelDeleteLimit: 3,
  roleDeleteLimit: 3,
  forbiddenPermissionLimit: 3,
  nonWhitelistBanLimit: 2,
  spamLimit: 5,
  spamInterval: 5000,
  
  
  forbiddenPermissions: [
    PermissionFlagsBits.Administrator,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.ManageGuild,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.ModerateMembers,
    PermissionFlagsBits.ManageWebhooks,
    PermissionFlagsBits.MentionEveryone
  ],
  
  
  profanities: [
    'amk', 'aq', 'piç', 'göt', 'sik', 'yarrak', 'amcık', 
    'oruspu', 'sikerim', 'siktir', 'ananı', 'ananı sikim'
  ],
  
 
  muteRoleName: 'Susturulmuş',
  
  
  autoMute: true,
  warningSystem: true,
  autoLogging: true,
  backupSystem: true
};


function loadConfig() {
  try {
    
    if (fs.existsSync('./bot-config.json')) {
      const userConfigData = fs.readFileSync('./bot-config.json', 'utf8');
      const userConfig = JSON.parse(userConfigData);
      
      
      const mergedConfig = { ...DEFAULT_CONFIG, ...userConfig };
      console.log('✅ Kullanıcı yapılandırması başarıyla yüklendi.');
      return mergedConfig;
    }
  } catch (error) {
    console.error('❌ Yapılandırma dosyası yüklenirken hata:', error);
  }
  
  
  console.log('ℹ️ Kullanıcı yapılandırması bulunamadı, varsayılan ayarlar kullanılıyor.');
  return DEFAULT_CONFIG;
}


let CONFIG = loadConfig();


const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const BACKUP_DIR = path.join(ROOT_DIR, 'backups');
const WHITELIST_FILE = path.join(DATA_DIR, 'whitelist.json');
const MUTES_FILE = path.join(DATA_DIR, 'mutes.json');
const WARNINGS_FILE = path.join(DATA_DIR, 'warnings.json');
const BANCOUNT_FILE = path.join(DATA_DIR, 'bancount.json');
const VANITY_FILE = path.join(DATA_DIR, 'vanity.json');


if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);


function loadJSON(file, fallback) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (error) {
    console.error(`Error loading ${file}:`, error);
  }
  return fallback;
}

function saveJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error saving ${file}:`, error);
  }
}


let whitelist = loadJSON(WHITELIST_FILE, { guilds: {} });
let mutes = loadJSON(MUTES_FILE, { guilds: {} });
let warnings = loadJSON(WARNINGS_FILE, { guilds: {} });
let bancount = loadJSON(BANCOUNT_FILE, { guilds: {} });
let vanityStore = loadJSON(VANITY_FILE, { guilds: {} });


function mention(id) {
  return `<@${id}>`;
}

function logChannel(guild) {
  return CONFIG.logChannel ? guild.channels.cache.get(CONFIG.logChannel) : null;
}

async function sendLog(guild, embed) {
  try {
    const channel = logChannel(guild);
    if (channel && CONFIG.autoLogging) await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error sending log:', error);
  }
}

function parseDuration(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)(s|d|sa|g)$/i);
  if (!match) return null;
  
  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  
  switch (unit) {
    case 's': return num * 1000;
    case 'd': return num * 60 * 1000;
    case 'sa': return num * 60 * 60 * 1000;
    case 'g': return num * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

function msToDuration(ms) {
  if (ms <= 0) return 'bitti';
  
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60000) % 60;
  const hours = Math.floor(ms / 3600000) % 24;
  const days = Math.floor(ms / 86400000);
  
  return `${days ? `${days}g ` : ''}${hours ? `${hours}sa ` : ''}${minutes ? `${minutes}d ` : ''}${seconds}s`;
}

function isWhitelisted(guildId, userId) {
  if (!whitelist.guilds[guildId]) {
    whitelist.guilds[guildId] = { users: [] };
  }
  return userId === CONFIG.ownerID || whitelist.guilds[guildId].users.includes(userId);
}

function ensureGuildStructure(store, guildId) {
  if (!store.guilds[guildId]) {
    store.guilds[guildId] = { users: [], records: {}, count: {} };
  }
  
  if (store === bancount && !store.guilds[guildId].count) {
    store.guilds[guildId].count = {};
  }
  
  if (store === vanityStore && store.guilds[guildId].vanity === undefined) {
    store.guilds[guildId].vanity = null;
  }
  
  if (store === mutes && !store.guilds[guildId].records) {
    store.guilds[guildId].records = {};
  }
  
  if (store === warnings && !store.guilds[guildId].records) {
    store.guilds[guildId].records = {};
  }
}


const userActions = new Map();

function addAction(userId, type, limit) {
  if (!userActions.has(userId)) {
    userActions.set(userId, { channel: 0, role: 0, permission: 0 });
  }
  
  const actions = userActions.get(userId);
  actions[type]++;
  
  return actions[type] >= limit;
}


async function punishUser(guild, userId, reason) {
  try {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;
    
    await member.roles.set([], reason).catch(() => {});
    
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('🚨 Koruma Sistemi: Limit Aşıldı')
      .setDescription(`${mention(userId)} tüm rolleri alındı.\n**Sebep:** ${reason}`)
      .setTimestamp();
    
    await sendLog(guild, embed);
  } catch (error) {
    console.error('Error punishing user:', error);
  }
}


async function createMuteRole(guild) {
  try {
    let role = guild.roles.cache.find(r => r.name === CONFIG.muteRoleName);
    
    if (!role) {
      role = await guild.roles.create({
        name: CONFIG.muteRoleName,
        permissions: [],
        reason: 'Otomatik mute rolü'
      });
    }
    
    if (!role) return null;
    
    
    const permissions = {
      SendMessages: false,
      AddReactions: false,
      SendMessagesInThreads: false,
      CreatePublicThreads: false,
      CreatePrivateThreads: false,
      Speak: false,
      Connect: false
    };
    
    for (const [_, channel] of guild.channels.cache) {
      try {
        if (channel.isTextBased()) {
          await channel.permissionOverwrites.edit(role, {
            SendMessages: false,
            AddReactions: false,
            SendMessagesInThreads: false,
            CreatePublicThreads: false,
            CreatePrivateThreads: false
          }).catch(() => {});
        } else if (channel.isVoiceBased()) {
          await channel.permissionOverwrites.edit(role, {
            Speak: false,
            Connect: false
          }).catch(() => {});
        }
      } catch (error) {
        console.error('Error applying mute role to channel:', error);
      }
    }
    
    return role;
  } catch (error) {
    console.error('Error creating mute role:', error);
    return null;
  }
}

async function applyMuteRoleToNewChannel(channel) {
  try {
    const role = channel.guild.roles.cache.find(r => r.name === CONFIG.muteRoleName);
    if (!role) return;
    
    if (channel.isTextBased()) {
      await channel.permissionOverwrites.edit(role, {
        SendMessages: false,
        AddReactions: false,
        SendMessagesInThreads: false,
        CreatePublicThreads: false,
        CreatePrivateThreads: false
      }).catch(() => {});
    } else if (channel.isVoiceBased()) {
      await channel.permissionOverwrites.edit(role, {
        Speak: false,
        Connect: false
      }).catch(() => {});
    }
  } catch (error) {
    console.error('Error applying mute role to new channel:', error);
  }
}

async function applyMute(guild, moderator, targetId, durationMs, reason) {
  try {
    if (!CONFIG.autoMute) return;
    
    ensureGuildStructure(mutes, guild.id);
    const muteRole = await createMuteRole(guild);
    if (!muteRole) return;
    
    const target = await guild.members.fetch(targetId).catch(() => null);
    if (!target) return;
    
    
    if (!target.roles.cache.has(muteRole.id)) {
      await target.roles.add(muteRole, reason || 'Mute').catch(() => {});
    }
    
    const endTime = durationMs ? Date.now() + durationMs : null;
    mutes.guilds[guild.id].records[targetId] = { reason, endTime };
    saveJSON(MUTES_FILE, mutes);
    
    const embed = new EmbedBuilder()
      .setColor(0x5555ff)
      .setTitle('🔇 Susturuldu')
      .addFields(
        { name: 'Kullanıcı', value: `${mention(targetId)} (${targetId})`, inline: true },
        { name: 'Yetkili', value: `${mention(moderator.id)} (${moderator.id})`, inline: true },
        { name: 'Süre', value: endTime ? msToDuration(endTime - Date.now()) : 'Sınırsız', inline: true },
        { name: 'Sebep', value: reason || 'Belirtilmedi', inline: false }
      )
      .setTimestamp();
    
    await sendLog(guild, embed);
  } catch (error) {
    console.error('Error applying mute:', error);
  }
}

async function removeMute(guild, moderator, targetId, reason = 'Unmute') {
  try {
    ensureGuildStructure(mutes, guild.id);
    const muteRole = guild.roles.cache.find(r => r.name === CONFIG.muteRoleName);
    const target = await guild.members.fetch(targetId).catch(() => null);
    
    if (target && muteRole && target.roles.cache.has(muteRole.id)) {
      await target.roles.remove(muteRole, reason).catch(() => {});
    }
    
    
    if (mutes.guilds[guild.id]?.records?.[targetId]) {
      delete mutes.guilds[guild.id].records[targetId];
      saveJSON(MUTES_FILE, mutes);
    }
    
    const embed = new EmbedBuilder()
      .setColor(0x77ddff)
      .setTitle('🔊 Susturma Kaldırıldı')
      .addFields(
        { name: 'Kullanıcı', value: `${mention(targetId)} (${targetId})`, inline: true },
        { name: 'Yetkili', value: `${mention(moderator.id)} (${moderator.id})`, inline: true }
      )
      .setTimestamp();
    
    await sendLog(guild, embed);
  } catch (error) {
    console.error('Error removing mute:', error);
  }
}


async function addWarning(guild, moderator, targetId, reason) {
  try {
    if (!CONFIG.warningSystem) return;
    
    ensureGuildStructure(warnings, guild.id);
    
    if (!warnings.guilds[guild.id].records[targetId]) {
      warnings.guilds[guild.id].records[targetId] = [];
    }
    
    const warning = {
      reason,
      moderatorId: moderator.id,
      time: Date.now()
    };
    
    warnings.guilds[guild.id].records[targetId].push(warning);
    saveJSON(WARNINGS_FILE, warnings);
    
    const embed = new EmbedBuilder()
      .setColor(0xffaa00)
      .setTitle('⚠️ Uyarı Verildi')
      .addFields(
        { name: 'Kullanıcı', value: `${mention(targetId)} (${targetId})`, inline: true },
        { name: 'Yetkili', value: `${mention(moderator.id)} (${moderator.id})`, inline: true },
        { name: 'Sebep', value: reason, inline: false },
        { name: 'Toplam Uyarı', value: warnings.guilds[guild.id].records[targetId].length, inline: true }
      )
      .setTimestamp();
    
    await sendLog(guild, embed);
  } catch (error) {
    console.error('Error adding warning:', error);
  }
}

async function removeWarning(guild, moderator, targetId, warningIndex) {
  try {
    if (!CONFIG.warningSystem) return false;
    
    ensureGuildStructure(warnings, guild.id);
    
    if (!warnings.guilds[guild.id].records[targetId] || 
        warningIndex < 1 || 
        warningIndex > warnings.guilds[guild.id].records[targetId].length) {
      return false;
    }
    
    const removedWarning = warnings.guilds[guild.id].records[targetId].splice(warningIndex - 1, 1)[0];
    saveJSON(WARNINGS_FILE, warnings);
    
    const embed = new EmbedBuilder()
      .setColor(0x77dd77)
      .setTitle('♻️ Uyarı Kaldırıldı')
      .addFields(
        { name: 'Kullanıcı', value: `${mention(targetId)} (${targetId})`, inline: true },
        { name: 'Yetkili', value: `${mention(moderator.id)} (${moderator.id})`, inline: true },
        { name: 'Kaldırılan Uyarı', value: removedWarning.reason, inline: false }
      )
      .setTimestamp();
    
    await sendLog(guild, embed);
    return true;
  } catch (error) {
    console.error('Error removing warning:', error);
    return false;
  }
}


async function backupGuild(guild) {
  try {
    if (!CONFIG.backupSystem) return null;
    
    const data = {
      guildId: guild.id,
      timestamp: new Date().toISOString(),
      roles: [],
      channels: []
    };
    
    guild.roles.cache.forEach(role => {
      data.roles.push({
        name: role.name,
        permissions: role.permissions.bitfield.toString(),
        color: role.color,
        hoist: role.hoist,
        mentionable: role.mentionable,
        managed: role.managed,
        position: role.position
      });
    });
    
    guild.channels.cache.forEach(channel => {
      data.channels.push({
        name: channel.name,
        type: channel.type,
        parentId: channel.parentId,
        position: channel.rawPosition
      });
    });
    
    const file = path.join(BACKUP_DIR, `${guild.id}_${Date.now()}.json`);
    saveJSON(file, data);
    return file;
  } catch (error) {
    console.error('Error backing up guild:', error);
    return null;
  }
}

async function restoreGuild(guild, mode) {
  try {
    if (!CONFIG.backupSystem) return;
    
    const backupFiles = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith(guild.id))
      .sort()
      .reverse();
    
    if (!backupFiles.length) return;
    
    const file = path.join(BACKUP_DIR, backupFiles[0]);
    const data = loadJSON(file);
    if (!data) return;
    
    const needRole = (r) => !guild.roles.cache.find(x => x.name === r.name);
    const needChannel = (c) => !guild.channels.cache.find(x => x.name === c.name);
    
    for (const role of data.roles) {
      if (needRole(role)) {
        await guild.roles.create({
          name: role.name,
          permissions: BigInt(role.permissions),
          color: role.color
        }).catch(() => {});
      }
    }
    
    for (const channel of data.channels) {
      if (needChannel(channel)) {
        await guild.channels.create({
          name: channel.name,
          type: channel.type,
          parent: channel.parentId
        }).catch(() => {});
      }
    }
  } catch (error) {
    console.error('Error restoring guild:', error);
  }
}


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember, Partials.Reaction]
});


client.commands = new Collection();


const commands = [
  {
    name: 'yardim',
    description: 'Yardım menüsünü gösterir',
    permissions: [],
    async execute(client, message, args) {
      
      const categories = {
        moderasyon: [
          { name: 'ban', usage: '<kullanıcı> [sebep]', description: 'Kullanıcıyı banlar' },
          { name: 'unban', usage: '<kullanıcı-id>', description: 'Banı kaldırır' },
          { name: 'kick', usage: '<kullanıcı> [sebep]', description: 'Kullanıcıyı atar' },
          { name: 'mute', usage: '<kullanıcı> [süre] [sebep]', description: 'Kullanıcıyı susturur' },
          { name: 'unmute', usage: '<kullanıcı>', description: 'Susturmayı kaldırır' },
          { name: 'uyar', usage: '<kullanıcı> <sebep>', description: 'Kullanıcıya uyarı verir' },
          { name: 'uyarıkaldir', usage: '<kullanıcı> <numara>', description: 'Uyarıyı kaldırır' },
          { name: 'uyarılar', usage: '<kullanıcı>', description: 'Kullanıcının uyarılarını gösterir' },
          { name: 'temizle', usage: '<miktar>', description: 'Mesajları siler' },
          { name: 'yavaşmod', usage: '<saniye>', description: 'Kanal için yavaş mod ayarlar' },
          { name: 'kilitle', usage: '[sebep]', description: 'Kanalı kilitler' },
          { name: 'kilidaç', usage: '[sebep]', description: 'Kanal kilidini açar' }
        ],
        yonetim: [
          { name: 'rolver', usage: '<kullanıcı> <rol>', description: 'Kullanıcıya rol verir' },
          { name: 'rolal', usage: '<kullanıcı> <rol>', description: 'Kullanıcıdan rol alır' },
          { name: 'kanaloluştur', usage: '<isim> [tip]', description: 'Yeni kanal oluşturur' },
          { name: 'kanalsil', usage: '<kanal>', description: 'Kanal siler' },
          { name: 'rololuştur', usage: '<isim> [renk]', description: 'Yeni rol oluşturur' },
          { name: 'rolsil', usage: '<rol>', description: 'Rol siler' },
          { name: 'beyazliste', usage: '', description: 'Beyaz listeyi gösterir' },
          { name: 'beyazlisteekle', usage: '<kullanıcı-id>', description: 'Beyaz listeye ekler' },
          { name: 'beyazlistesil', usage: '<kullanıcı-id>', description: 'Beyaz listeden çıkarır' },
          { name: 'yedekle', usage: '', description: 'Sunucu yedeği alır' },
          { name: 'geriyükle', usage: '<eksik|tam>', description: 'Sunucu yedeğini yükler' }
        ],
        bilgi: [
          { name: 'bilgi', usage: '[kullanıcı]', description: 'Kullanıcı veya sunucu bilgisi' },
          { name: 'avatar', usage: '[kullanıcı]', description: 'Kullanıcının avatarını gösterir' },
          { name: 'ping', usage: '', description: 'Botun ping değerini gösterir' },
          { name: 'mute-liste', usage: '', description: 'Susturulanları listeler' }
        ]
      };

      
      if (args[0]) {
        const categoryName = args[0].toLowerCase();
        const category = categories[categoryName];
        
        if (!category) {
          return message.reply('Geçersiz kategori! Kategoriler: moderasyon, yonetim, bilgi');
        }
        
        const embed = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle(`🤖 ${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} Komutları`)
          .setDescription(`Prefix: **${CONFIG.prefix}**`)
          .setTimestamp();
        
        category.forEach(command => {
          embed.addFields({
            name: `${CONFIG.prefix}${command.name} ${command.usage}`,
            value: command.description
          });
        });
        
        return message.channel.send({ embeds: [embed] });
      }
      
      
      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🤖 Yardım Menüsü')
        .setDescription(`Prefix: **${CONFIG.prefix}**\nKomut kategorileri için ${CONFIG.prefix}yardim [kategori] yazın.`)
        .addFields(
          { name: '📋 Kategoriler', value: '`moderasyon`, `yonetim`, `bilgi`' },
          { name: '🔧 Örnek Kullanım', value: `${CONFIG.prefix}yardim moderasyon` }
        )
        .setTimestamp();
      
      message.channel.send({ embeds: [embed] });
    }
  },
  {
    name: 'ban',
    description: 'Kullanıcıyı banlar',
    permissions: [PermissionFlagsBits.BanMembers],
    async execute(client, message, args) {
      if (args.length < 1) {
        return message.reply(`Kullanım: ${CONFIG.prefix}ban [kullanıcı] [sebep]`);
      }
      
      const targetId = args[0].replace(/[<@!>]/g, '');
      const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';
      
      try {
        await message.guild.members.ban(targetId, { reason: reason });
        
        const embed = new EmbedBuilder()
          .setColor(0xff5555)
          .setTitle('🔨 Ban')
          .addFields(
            { name: 'Kullanıcı', value: `${mention(targetId)} (${targetId})`, inline: true },
            { name: 'Yetkili', value: `${mention(message.author.id)} (${message.author.id})`, inline: true },
            { name: 'Sebep', value: reason, inline: false }
          )
          .setTimestamp();
        
        await sendLog(message.guild, embed);
        await message.reply(`✅ ${targetId} banlandı.`);
      } catch (error) {
        console.error('Ban error:', error);
        await message.reply('❌ Kullanıcı banlanamadı. Yetkim olmayabilir.');
      }
    }
  },
  {
    name: 'unban',
    description: 'Banı kaldırır',
    permissions: [PermissionFlagsBits.BanMembers],
    async execute(client, message, args) {
      if (args.length < 1) {
        return message.reply(`Kullanım: ${CONFIG.prefix}unban [kullanıcı-id]`);
      }
      
      const id = args[0];
      
      try {
        await message.guild.members.unban(id);
        
        const embed = new EmbedBuilder()
          .setColor(0x77dd77)
          .setTitle('♻️ Unban')
          .addFields(
            { name: 'Kullanıcı', value: `${mention(id)} (${id})`, inline: true },
            { name: 'Yetkili', value: `${mention(message.author.id)} (${message.author.id})`, inline: true }
          )
          .setTimestamp();
        
        await sendLog(message.guild, embed);
        await message.reply(`✅ ${id} banı kaldırıldı.`);
      } catch (error) {
        console.error('Unban error:', error);
        await message.reply('❌ Ban kaldırılamadı. Kullanıcı banlı olmayabilir.');
      }
    }
  },
  {
    name: 'kick',
    description: 'Kullanıcıyı atar',
    permissions: [PermissionFlagsBits.KickMembers],
    async execute(client, message, args) {
      if (args.length < 1) {
        return message.reply(`Kullanım: ${CONFIG.prefix}kick [kullanıcı] [sebep]`);
      }
      
      const targetId = args[0].replace(/[<@!>]/g, '');
      const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';
      
      try {
        const target = await message.guild.members.fetch(targetId);
        await target.kick(reason);
        
        const embed = new EmbedBuilder()
          .setColor(0xffaa00)
          .setTitle('👢 Kick')
          .addFields(
            { name: 'Kullanıcı', value: `${mention(targetId)} (${targetId})`, inline: true },
            { name: 'Yetkili', value: `${mention(message.author.id)} (${message.author.id})`, inline: true },
            { name: 'Sebep', value: reason, inline: false }
          )
          .setTimestamp();
        
        await sendLog(message.guild, embed);
        await message.reply(`✅ ${targetId} atıldı.`);
      } catch (error) {
        console.error('Kick error:', error);
        await message.reply('❌ Kullanıcı atılamadı. Yetkim olmayabilir.');
      }
    }
  },
  {
    name: 'mute',
    description: 'Kullanıcıyı susturur',
    permissions: [PermissionFlagsBits.ModerateMembers],
    async execute(client, message, args) {
      if (!CONFIG.autoMute) {
        return message.reply('❌ Otomatik mute sistemi şu anda kapalı.');
      }
      
      if (args.length < 1) {
        return message.reply(`Kullanım: ${CONFIG.prefix}mute [kullanıcı] [süre] [sebep]`);
      }
      
      const targetId = args[0].replace(/[<@!>]/g, '');
      
      let durationMs = null;
      let reason = 'Sebep belirtilmedi';
      
      if (args[1]) {
        durationMs = parseDuration(args[1]);
        if (durationMs) {
          reason = args.slice(2).join(' ') || reason;
        } else {
          reason = args.slice(1).join(' ') || reason;
        }
      }
      
      await applyMute(message.guild, message.member, targetId, durationMs, reason);
      await message.reply(`✅ ${targetId} susturuldu (${durationMs ? msToDuration(durationMs) : 'sınırsız'}).`);
    }
  },
  {
    name: 'unmute',
    description: 'Susturmayı kaldırır',
    permissions: [PermissionFlagsBits.ModerateMembers],
    async execute(client, message, args) {
      if (!CONFIG.autoMute) {
        return message.reply('❌ Otomatik mute sistemi şu anda kapalı.');
      }
      
      if (args.length < 1) {
        return message.reply(`Kullanım: ${CONFIG.prefix}unmute [kullanıcı]`);
      }
      
      const targetId = args[0].replace(/[<@!>]/g, '');
      await removeMute(message.guild, message.member, targetId);
      await message.reply(`✅ ${targetId} susturulması kaldırıldı.`);
    }
  },
  {
    name: 'uyar',
    description: 'Kullanıcıya uyarı verir',
    permissions: [PermissionFlagsBits.ModerateMembers],
    async execute(client, message, args) {
      if (!CONFIG.warningSystem) {
        return message.reply('❌ Uyarı sistemi şu anda kapalı.');
      }
      
      if (args.length < 2) {
        return message.reply(`Kullanım: ${CONFIG.prefix}uyar [kullanıcı] [sebep]`);
      }
      
      const targetId = args[0].replace(/[<@!>]/g, '');
      const reason = args.slice(1).join(' ');
      
      await addWarning(message.guild, message.member, targetId, reason);
      await message.reply(`✅ ${targetId} kullanıcısına uyarı verildi.`);
    }
  },
  {
    name: 'uyarıkaldir',
    description: 'Uyarıyı kaldırır',
    permissions: [PermissionFlagsBits.ModerateMembers],
    async execute(client, message, args) {
      if (!CONFIG.warningSystem) {
        return message.reply('❌ Uyarı sistemi şu anda kapalı.');
      }
      
      if (args.length < 2) {
        return message.reply(`Kullanım: ${CONFIG.prefix}uyarıkaldir [kullanıcı] [numara]`);
      }
      
      const targetId = args[0].replace(/[<@!>]/g, '');
      const warningIndex = parseInt(args[1]);
      
      const success = await removeWarning(message.guild, message.member, targetId, warningIndex);
      if (success) {
        await message.reply(`✅ ${targetId} kullanıcısından ${warningIndex}. uyarı kaldırıldı.`);
      } else {
        await message.reply('❌ Uyarı kaldırılamadı. Geçersiz kullanıcı veya uyarı numarası.');
      }
    }
  },
  {
    name: 'uyarılar',
    description: 'Kullanıcının uyarılarını gösterir',
    permissions: [PermissionFlagsBits.ModerateMembers],
    async execute(client, message, args) {
      if (!CONFIG.warningSystem) {
        return message.reply('❌ Uyarı sistemi şu anda kapalı.');
      }
      
      const targetId = args.length > 0 ? args[0].replace(/[<@!>]/g, '') : message.author.id;
      ensureGuildStructure(warnings, message.guild.id);
      
      const userWarnings = warnings.guilds[message.guild.id].records[targetId] || [];
      
      if (userWarnings.length === 0) {
        return message.reply(`${mention(targetId)} kullanıcısının hiç uyarısı yok.`);
      }
      
      const embed = new EmbedBuilder()
        .setColor(0xffaa00)
        .setTitle(`⚠️ ${mention(targetId)} Uyarıları`)
        .setDescription(userWarnings.map((warning, index) => 
          `**${index + 1}.** ${warning.reason} - <@${warning.moderatorId}> - ${new Date(warning.time).toLocaleString('tr-TR')}`
        ).join('\n'))
        .setTimestamp();
      
      await message.channel.send({ embeds: [embed] });
    }
  },
  {
    name: 'temizle',
    description: 'Mesajları siler',
    permissions: [PermissionFlagsBits.ManageMessages],
    async execute(client, message, args) {
      if (args.length < 1) {
        return message.reply(`Kullanım: ${CONFIG.prefix}temizle [miktar]`);
      }
      
      const amount = parseInt(args[0]);
      if (isNaN(amount) || amount < 1 || amount > 100) {
        return message.reply('Lütfen 1-100 arasında geçerli bir sayı girin.');
      }
      
      try {
        await message.channel.bulkDelete(amount, true);
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('🧹 Mesajlar Silindi')
          .setDescription(`${amount} mesaj ${mention(message.author.id)} tarafından silindi.`)
          .setTimestamp();
        
        await message.channel.send({ embeds: [embed] });
      } catch (error) {
        console.error('Message deletion error:', error);
        await message.reply('❌ Mesajlar silinemedi. 14 günden eski mesajlar silinemez.');
      }
    }
  },
  {
    name: 'yavaşmod',
    description: 'Kanal için yavaş mod ayarlar',
    permissions: [PermissionFlagsBits.ManageChannels],
    async execute(client, message, args) {
      if (args.length < 1) {
        return message.reply(`Kullanım: ${CONFIG.prefix}yavaşmod [saniye]`);
      }
      
      const seconds = parseInt(args[0]);
      if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
        return message.reply('Lütfen 0-21600 arasında geçerli bir saniye değeri girin.');
      }
      
      try {
        await message.channel.setRateLimitPerUser(seconds);
        await message.reply(`✅ Kanal yavaş modu ${seconds} saniye olarak ayarlandı.`);
      } catch (error) {
        console.error('Slow mode error:', error);
        await message.reply('❌ Yavaş mod ayarlanamadı.');
      }
    }
  },
  {
    name: 'kilitle',
    description: 'Kanalı kilitler',
    permissions: [PermissionFlagsBits.ManageChannels],
    async execute(client, message, args) {
      const reason = args.join(' ') || 'Belirtilmedi';
      
      try {
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
          SendMessages: false
        }, { reason: `Kilitlendi: ${reason}` });
        
        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle('🔒 Kanal Kilitlendi')
          .setDescription(`Bu kanal ${mention(message.author.id)} tarafından kilitlendi.`)
          .addFields({ name: 'Sebep', value: reason })
          .setTimestamp();
        
        await message.channel.send({ embeds: [embed] });
      } catch (error) {
        console.error('Channel lock error:', error);
        await message.reply('❌ Kanal kilitlenemedi.');
      }
    }
  },
  {
    name: 'kilidaç',
    description: 'Kanal kilidini açar',
    permissions: [PermissionFlagsBits.ManageChannels],
    async execute(client, message, args) {
      const reason = args.join(' ') || 'Belirtilmedi';
      
      try {
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
          SendMessages: null
        }, { reason: `Kilidi açıldı: ${reason}` });
        
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('🔓 Kanal Kilidi Açıldı')
          .setDescription(`Bu kanalın kilidi ${mention(message.author.id)} tarafından açıldı.`)
          .addFields({ name: 'Sebep', value: reason })
          .setTimestamp();
        
        await message.channel.send({ embeds: [embed] });
      } catch (error) {
        console.error('Channel unlock error:', error);
        await message.reply('❌ Kanal kilidi açılamadı.');
      }
    }
  },
  {
    name: 'bilgi',
    description: 'Kullanıcı veya sunucu bilgisi',
    permissions: [],
    async execute(client, message, args) {
      const target = args.length > 0 
        ? message.mentions.users.first() || message.guild.members.cache.get(args[0])?.user 
        : message.author;
      
      if (!target) {
        return message.reply('Kullanıcı bulunamadı.');
      }
      
      const member = message.guild.members.cache.get(target.id);
      
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(`${target.tag} Bilgileri`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: 'ID', value: target.id, inline: true },
          { name: 'Kullanıcı Adı', value: target.username, inline: true },
          { name: 'Takma Ad', value: member?.nickname || 'Yok', inline: true },
          { name: 'Bot mu?', value: target.bot ? 'Evet' : 'Hayır', inline: true },
          { name: 'Hesap Oluşturma', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true },
          { name: 'Sunucuya Katılma', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Bilinmiyor', inline: true }
        )
        .setTimestamp();
      
      if (member) {
        const roles = member.roles.cache
          .filter(role => role.id !== message.guild.id)
          .map(role => role.name)
          .join(', ') || 'Yok';
        
        embed.addFields({ name: 'Roller', value: roles, inline: false });
      }
      
      await message.channel.send({ embeds: [embed] });
    }
  },
  {
    name: 'avatar',
    description: 'Kullanıcının avatarını gösterir',
    permissions: [],
    async execute(client, message, args) {
      const target = args.length > 0 
        ? message.mentions.users.first() || message.guild.members.cache.get(args[0])?.user 
        : message.author;
      
      if (!target) {
        return message.reply('Kullanıcı bulunamadı.');
      }
      
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(`${target.tag} Avatarı`)
        .setImage(target.displayAvatarURL({ dynamic: true, size: 4096 }))
        .setTimestamp();
      
      await message.channel.send({ embeds: [embed] });
    }
  },
  {
    name: 'ping',
    description: 'Botun ping değerini gösterir',
    permissions: [],
    async execute(client, message, args) {
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('🏓 Pong!')
        .setDescription(`Botun ping değeri: ${client.ws.ping}ms`)
        .setTimestamp();
      
      await message.channel.send({ embeds: [embed] });
    }
  },
  {
    name: 'beyazliste',
    description: 'Beyaz listeyi gösterir',
    permissions: [PermissionFlagsBits.Administrator],
    async execute(client, message, args) {
      ensureGuildStructure(whitelist, message.guild.id);
      const list = whitelist.guilds[message.guild.id].users;
      
      const embed = new EmbedBuilder()
        .setColor(0x00ff88)
        .setTitle('📋 Beyaz Liste')
        .setDescription(list.length ? 
          list.map(id => `• ${mention(id)} (${id})`).join('\n') : 
          'Boş'
        )
        .setTimestamp();
      
      await message.channel.send({ embeds: [embed] });
    }
  },
  {
    name: 'beyazlisteekle',
    description: 'Beyaz listeye ekler',
    permissions: [PermissionFlagsBits.Administrator],
    async execute(client, message, args) {
      if (args.length < 1) {
        return message.reply(`Kullanım: ${CONFIG.prefix}beyazlisteekle [kullanıcı-id]`);
      }
      
      const id = args[0];
      ensureGuildStructure(whitelist, message.guild.id);
      
      if (!whitelist.guilds[message.guild.id].users.includes(id)) {
        whitelist.guilds[message.guild.id].users.push(id);
        saveJSON(WHITELIST_FILE, whitelist);
        await message.reply(`✅ ${id} beyaz listeye eklendi.`);
      } else {
        await message.reply(`ℹ️ ${id} zaten beyaz listede.`);
      }
    }
  },
  {
    name: 'beyazlistesil',
    description: 'Beyaz listeden çıkarır',
    permissions: [PermissionFlagsBits.Administrator],
    async execute(client, message, args) {
      if (args.length < 1) {
        return message.reply(`Kullanım: ${CONFIG.prefix}beyazlistesil [kullanıcı-id]`);
      }
      
      const id = args[0];
      ensureGuildStructure(whitelist, message.guild.id);
      
      const index = whitelist.guilds[message.guild.id].users.indexOf(id);
      if (index !== -1) {
        whitelist.guilds[message.guild.id].users.splice(index, 1);
        saveJSON(WHITELIST_FILE, whitelist);
        await message.reply(`✅ ${id} beyaz listeden çıkarıldı.`);
      } else {
        await message.reply(`ℹ️ ${id} beyaz listede bulunamadı.`);
      }
    }
  },
  {
    name: 'yedekle',
    description: 'Sunucu yedeği alır',
    permissions: [PermissionFlagsBits.Administrator],
    async execute(client, message, args) {
      if (!CONFIG.backupSystem) {
        return message.reply('❌ Yedekleme sistemi şu anda kapalı.');
      }
      
      const msg = await message.reply('Yedek alınıyor...');
      const file = await backupGuild(message.guild);
      if (file) {
        await msg.edit(`✅ Yedek alındı: \`${file}\``);
      } else {
        await msg.edit('❌ Yedek alınamadı.');
      }
    }
  },
  {
    name: 'geriyükle',
    description: 'Sunucu yedeğini yükler',
    permissions: [PermissionFlagsBits.Administrator],
    async execute(client, message, args) {
      if (!CONFIG.backupSystem) {
        return message.reply('❌ Yedekleme sistemi şu anda kapalı.');
      }
      
      if (args.length < 1) {
        return message.reply(`Kullanım: ${CONFIG.prefix}geriyükle [eksik|tam]`);
      }
      
      const mode = args[0];
      if (!['eksik', 'tam'].includes(mode)) {
        return message.reply('Geçersiz mod. "eksik" veya "tam" kullanın.');
      }
      
      const msg = await message.reply(`Yedek yükleniyor (${mode})...`);
      await restoreGuild(message.guild, mode);
      await msg.edit(`✅ Yedek yüklendi (${mode}).`);
    }
  },
  {
    name: 'mute-liste',
    description: 'Susturulanları listeler',
    permissions: [PermissionFlagsBits.ModerateMembers],
    async execute(client, message, args) {
      if (!CONFIG.autoMute) {
        return message.reply('❌ Otomatik mute sistemi şu anda kapalı.');
      }
      
      ensureGuildStructure(mutes, message.guild.id);
      const records = mutes.guilds[message.guild.id].records || {};
      
      const list = Object.entries(records).map(([id, data]) =>
        `• ${mention(id)} (${id}) — ${data.reason || 'Sebep yok'}${
          data.endTime ? ` (kalan: ${msToDuration(data.endTime - Date.now())})` : ' (sınırsız)'
        }`
      );
      
      const embed = new EmbedBuilder()
        .setColor(0xffcc00)
        .setTitle('🔇 Susturulanlar')
        .setDescription(list.length ? list.join('\n') : 'Boş')
        .setTimestamp();
      
      await message.channel.send({ embeds: [embed] });
    }
  },
  {
    name: 'rolver',
    description: 'Kullanıcıya rol verir',
    permissions: [PermissionFlagsBits.ManageRoles],
    async execute(client, message, args) {
      if (args.length < 2) {
        return message.reply(`Kullanım: ${CONFIG.prefix}rolver [kullanıcı] [rol]`);
      }
      
      const targetId = args[0].replace(/[<@!>]/g, '');
      const roleName = args.slice(1).join(' ');
      
      const role = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
      if (!role) {
        return message.reply('Rol bulunamadı.');
      }
      
      const target = await message.guild.members.fetch(targetId).catch(() => null);
      if (!target) {
        return message.reply('Kullanıcı bulunamadı.');
      }
      
      try {
        await target.roles.add(role);
        await message.reply(`✅ ${mention(targetId)} kullanıcısına "${role.name}" rolü verildi.`);
      } catch (error) {
        console.error('Role add error:', error);
        await message.reply('❌ Rol verilemedi. Yetkim olmayabilir.');
      }
    }
  },
  {
    name: 'rolal',
    description: 'Kullanıcıdan rol alır',
    permissions: [PermissionFlagsBits.ManageRoles],
    async execute(client, message, args) {
      if (args.length < 2) {
        return message.reply(`Kullanım: ${CONFIG.prefix}rolal [kullanıcı] [rol]`);
      }
      
      const targetId = args[0].replace(/[<@!>]/g, '');
      const roleName = args.slice(1).join(' ');
      
      const role = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
      if (!role) {
        return message.reply('Rol bulunamadı.');
      }
      
      const target = await message.guild.members.fetch(targetId).catch(() => null);
      if (!target) {
        return message.reply('Kullanıcı bulunamadı.');
      }
      
      try {
        await target.roles.remove(role);
        await message.reply(`✅ ${mention(targetId)} kullanıcısından "${role.name}" rolü alındı.`);
      } catch (error) {
        console.error('Role remove error:', error);
        await message.reply('❌ Rol alınamadı. Yetkim olmayabilir.');
      }
    }
  },
  {
    name: 'kanaloluştur',
    description: 'Yeni kanal oluşturur',
    permissions: [PermissionFlagsBits.ManageChannels],
    async execute(client, message, args) {
      if (args.length < 1) {
        return message.reply(`Kullanım: ${CONFIG.prefix}kanaloluştur [isim] [tip]`);
      }
      
      const name = args[0];
      const type = args[1] || 'text';
      
      let channelType;
      switch (type.toLowerCase()) {
        case 'text':
        case 'metin':
          channelType = ChannelType.GuildText;
          break;
        case 'voice':
        case 'ses':
          channelType = ChannelType.GuildVoice;
          break;
        case 'category':
        case 'kategori':
          channelType = ChannelType.GuildCategory;
          break;
        default:
          return message.reply('Geçersiz kanal tipi. text, voice veya category kullanın.');
      }
      
      try {
        const channel = await message.guild.channels.create({
          name: name,
          type: channelType
        });
        
        await message.reply(`✅ "${channel.name}" kanalı oluşturuldu.`);
      } catch (error) {
        console.error('Channel creation error:', error);
        await message.reply('❌ Kanal oluşturulamadı.');
      }
    }
  },
  {
    name: 'kanalsil',
    description: 'Kanal siler',
    permissions: [PermissionFlagsBits.ManageChannels],
    async execute(client, message, args) {
      if (args.length < 1) {
        return message.reply(`Kullanım: ${CONFIG.prefix}kanalsil [kanal]`);
      }
      
      const channelName = args.join(' ');
      const channel = message.guild.channels.cache.find(c => 
        c.name.toLowerCase() === channelName.toLowerCase()
      );
      
      if (!channel) {
        return message.reply('Kanal bulunamadı.');
      }
      
      try {
        await channel.delete();
        await message.reply(`✅ "${channel.name}" kanalı silindi.`);
      } catch (error) {
        console.error('Channel deletion error:', error);
        await message.reply('❌ Kanal silinemedi.');
      }
    }
  },
  {
    name: 'rololuştur',
    description: 'Yeni rol oluşturur',
    permissions: [PermissionFlagsBits.ManageRoles],
    async execute(client, message, args) {
      if (args.length < 1) {
        return message.reply(`Kullanım: ${CONFIG.prefix}rololuştur [isim] [renk]`);
      }
      
      const name = args[0];
      const color = args[1] ? args[1].replace('#', '') : null;
      
      try {
        const role = await message.guild.roles.create({
          name: name,
          color: color ? parseInt(color, 16) : null
        });
        
        await message.reply(`✅ "${role.name}" rolü oluşturuldu.`);
      } catch (error) {
        console.error('Role creation error:', error);
        await message.reply('❌ Rol oluşturulamadı.');
      }
    }
  },
  {
    name: 'rolsil',
    description: 'Rol siler',
    permissions: [PermissionFlagsBits.ManageRoles],
    async execute(client, message, args) {
      if (args.length < 1) {
        return message.reply(`Kullanım: ${CONFIG.prefix}rolsil [rol]`);
      }
      
      const roleName = args.join(' ');
      const role = message.guild.roles.cache.find(r => 
        r.name.toLowerCase() === roleName.toLowerCase()
      );
      
      if (!role) {
        return message.reply('Rol bulunamadı.');
      }
      
      try {
        await role.delete();
        await message.reply(`✅ "${role.name}" rolü silindi.`);
      } catch (error) {
        console.error('Role deletion error:', error);
        await message.reply('❌ Rol silinemedi.');
      }
    }
  }
];


commands.forEach(command => {
  client.commands.set(command.name, command);
});


client.on('ready', async () => {
  console.log(`✅ ${client.user.tag} olarak giriş yapıldı.`);
  console.log(`📋 Yapılandırma durumu:`);
  console.log(`  - Otomatik Mute: ${CONFIG.autoMute ? 'Açık' : 'Kapalı'}`);
  console.log(`  - Uyarı Sistemi: ${CONFIG.warningSystem ? 'Açık' : 'Kapalı'}`);
  console.log(`  - Otomatik Loglama: ${CONFIG.autoLogging ? 'Açık' : 'Kapalı'}`);
  console.log(`  - Yedekleme Sistemi: ${CONFIG.backupSystem ? 'Açık' : 'Kapalı'}`);
  console.log(`  - Davet Engelleme: ${CONFIG.inviteBlock ? 'Açık' : 'Kapalı'}`);
  console.log(`  - Spam Koruma: ${CONFIG.spamProtection ? 'Açık' : 'Kapalı'}`);
  console.log(`  - Küfür Engelleme: ${CONFIG.profanityFilter ? 'Açık' : 'Kapalı'}`);
  console.log(`  - Link Engelleme: ${CONFIG.linkBlock ? 'Açık' : 'Kapalı'}`);
  
  
  await client.user.setPresence({
    activities: [{ name: `By Zywexx | ${CONFIG.prefix}yardim`, type: ActivityType.Playing }],
    status: 'online'
  });
  
  
  for (const [guildId, guild] of client.guilds.cache) {
    await createMuteRole(guild);
    
    
    ensureGuildStructure(mutes, guildId);
    const records = mutes.guilds[guildId].records || {};
    
    for (const [userId, data] of Object.entries(records)) {
      
      if (data.endTime && Date.now() >= data.endTime) {
        await removeMute(guild, null, userId, 'Süre doldu (başlangıç senkronizasyonu)');
        continue;
      }
      
     
      const member = await guild.members.fetch(userId).catch(() => null);
      const role = guild.roles.cache.find(r => r.name === CONFIG.muteRoleName);
      
      if (member && role && !member.roles.cache.has(role.id)) {
        await member.roles.add(role, 'Senkronizasyon: kayıtlı mute').catch(() => {});
      }
    }
  }
});


client.on('guildCreate', async (guild) => {
  try {
    const allowed = (process.env.ALLOWED_GUILD_IDS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    
    if (allowed.length && !allowed.includes(guild.id)) {
      await guild.leave();
    } else {
      await createMuteRole(guild);
    }
  } catch (error) {
    console.error('Guild join error:', error);
  }
});


client.on('channelCreate', async (channel) => {
  await applyMuteRoleToNewChannel(channel);
});


client.on('messageCreate', async (message) => {
  
  if (message.author.bot) return;
  
  
  if (message.content.startsWith(CONFIG.prefix)) {
    const args = message.content.slice(CONFIG.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    const command = client.commands.get(commandName);
    
    if (command) {
      
      const hasPermission = command.permissions.length > 0 && 
        !command.permissions.some(perm => message.member.permissions.has(perm));
      
      if (hasPermission) {
        return message.reply('⛔ Bu komutu kullanma yetkiniz yok.');
      }
      
      try {
        await command.execute(client, message, args);
      } catch (error) {
        console.error(`Command error (${commandName}):`, error);
        await message.reply('❌ Komut çalıştırılırken bir hata oluştu.');
      }
    }
  }
  
  
  const guild = message.guild;
  if (!guild) return;
  
  
  if (isWhitelisted(guild.id, message.author.id)) return;
  
  
  if (CONFIG.inviteBlock) {
    const inviteRegex = /(discord\.gg|discord\.com\/invite)\/[A-Za-z0-9-]+/i;
    if (inviteRegex.test(message.content)) {
      try {
        await message.delete();
        await message.channel.send(`${mention(message.author.id)} davet linkleri bu sunucuda yasak.`);
        
        const embed = new EmbedBuilder()
          .setColor(0xdd4444)
          .setTitle('🚫 Davet Linki Engellendi')
          .addFields(
            { name: 'Kullanıcı', value: `${mention(message.author.id)} (${message.author.id})`, inline: true },
            { name: 'Kanal', value: `${message.channel}`, inline: true },
            { name: 'İçerik', value: message.content.slice(0, 400) }
          )
          .setTimestamp();
        
        await sendLog(guild, embed);
      } catch (error) {
        console.error('Invite block error:', error);
      }
    }
  }
  
  
  if (CONFIG.profanityFilter) {
    const hasProfanity = CONFIG.profanities.some(profanity => 
      message.content.toLowerCase().includes(profanity.toLowerCase())
    );
    
    if (hasProfanity) {
      try {
        await message.delete();
        await message.channel.send(`${mention(message.author.id)} lütfen küfür etmeyin.`);
        
        const embed = new EmbedBuilder()
          .setColor(0xdd4444)
          .setTitle('🚫 Küfür Engellendi')
          .addFields(
            { name: 'Kullanıcı', value: `${mention(message.author.id)} (${message.author.id})`, inline: true },
            { name: 'Kanal', value: `${message.channel}`, inline: true },
            { name: 'İçerik', value: message.content.slice(0, 400) }
          )
          .setTimestamp();
        
        await sendLog(guild, embed);
      } catch (error) {
        console.error('Profanity filter error:', error);
      }
    }
  }
  
  
  if (CONFIG.linkBlock) {
    const linkRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/i;
    if (linkRegex.test(message.content)) {
      try {
        await message.delete();
        await message.channel.send(`${mention(message.author.id)} linkler bu sunucuda yasak.`);
        
        const embed = new EmbedBuilder()
          .setColor(0xdd4444)
          .setTitle('🚫 Link Engellendi')
          .addFields(
            { name: 'Kullanıcı', value: `${mention(message.author.id)} (${message.author.id})`, inline: true },
            { name: 'Kanal', value: `${message.channel}`, inline: true },
            { name: 'İçerik', value: message.content.slice(0, 400) }
          )
          .setTimestamp();
        
        await sendLog(guild, embed);
      } catch (error) {
        console.error('Link block error:', error);
      }
    }
  }
  
  
  if (CONFIG.spamProtection) {
    const key = `${guild.id}-${message.author.id}`;
    
    if (!client.spamTracker) {
      client.spamTracker = new Map();
    }
    
    if (!client.spamTracker.has(key)) {
      client.spamTracker.set(key, {
        messages: [],
        interval: CONFIG.spamInterval,
        limit: CONFIG.spamLimit
      });
    }
    
    const userData = client.spamTracker.get(key);
    const now = Date.now();
    
    
    userData.messages = userData.messages.filter(time => now - time < userData.interval);
    
    
    userData.messages.push(now);
    
    
    if (userData.messages.length >= userData.limit) {
      try {
        
        const messagesToDelete = await message.channel.messages.fetch({ limit: 10 });
        const userMessages = messagesToDelete.filter(m => m.author.id === message.author.id);
        await message.channel.bulkDelete(userMessages);
        
        
        await applyMute(guild, guild.me, message.author.id, 5 * 60 * 1000, 'Spam yapma');
        
        await message.channel.send(`${mention(message.author.id)} spam yaptığınız için 5 dakika susturuldunuz.`);
        
        const embed = new EmbedBuilder()
          .setColor(0xffaa00)
          .setTitle('⚠️ Spam Engellendi')
          .addFields(
            { name: 'Kullanıcı', value: `${mention(message.author.id)} (${message.author.id})`, inline: true },
            { name: 'Kanal', value: `${message.channel}`, inline: true },
            { name: 'Eylem', value: '5 dakika susturuldu', inline: false }
          )
          .setTimestamp();
        
        await sendLog(guild, embed);
      } catch (error) {
        console.error('Spam protection error:', error);
      }
    }
  }
});


client.on('channelDelete', async (channel) => {
  try {
    const logs = await channel.guild.fetchAuditLogs({
      type: AuditLogEvent.ChannelDelete,
      limit: 1
    }).catch(() => null);
    
    const entry = logs?.entries.first();
    if (!entry) return;
    
    if (addAction(entry.executor.id, 'channel', CONFIG.channelDeleteLimit)) {
      await punishUser(channel.guild, entry.executor.id, 'Kanal silme limiti aşıldı');
    }
    
    const embed = new EmbedBuilder()
      .setColor(0xff6666)
      .setTitle('🗑️ Kanal Silme')
      .addFields(
        { name: 'Kanal', value: `#${channel.name} (${channel.id})`, inline: true },
        { name: 'Silen', value: `${mention(entry.executor.id)} (${entry.executor.id})`, inline: true }
      )
      .setTimestamp();
    
    await sendLog(channel.guild, embed);
  } catch (error) {
    console.error('Channel delete log error:', error);
  }
});


client.on('roleDelete', async (role) => {
  try {
    const logs = await role.guild.fetchAuditLogs({
      type: AuditLogEvent.RoleDelete,
      limit: 1
    }).catch(() => null);
    
    const entry = logs?.entries.first();
    if (!entry) return;
    
    if (addAction(entry.executor.id, 'role', CONFIG.roleDeleteLimit)) {
      await punishUser(role.guild, entry.executor.id, 'Rol silme limiti aşıldı');
    }
    
    const embed = new EmbedBuilder()
      .setColor(0xff6666)
      .setTitle('🎭 Rol Silme')
      .addFields(
        { name: 'Rol', value: `${role.name} (${role.id})`, inline: true },
        { name: 'Silen', value: `${mention(entry.executor.id)} (${entry.executor.id})`, inline: true }
      )
      .setTimestamp();
    
    await sendLog(role.guild, embed);
  } catch (error) {
    console.error('Role delete log error:', error);
  }
});


client.on('roleCreate', async (role) => {
  if (!CONFIG.dangerousRoleGuard) return;
  
  try {
    if (CONFIG.forbiddenPermissions.some(perm => role.permissions.has(perm))) {
      await role.setPermissions(0n, 'Yasaklı izinler kaldırıldı').catch(() => {});
      
      const logs = await role.guild.fetchAuditLogs({
        type: AuditLogEvent.RoleCreate,
        limit: 1
      }).catch(() => null);
      
      const entry = logs?.entries.first();
      if (!entry) return;
      
      if (addAction(entry.executor.id, 'permission', CONFIG.forbiddenPermissionLimit)) {
        await punishUser(role.guild, entry.executor.id, 'Yasaklı izin verme limiti aşıldı');
      }
      
      const embed = new EmbedBuilder()
        .setColor(0xffaa00)
        .setTitle('⚠️ Tehlikeli İzin Temizlendi (Rol Oluşturma)')
        .addFields(
          { name: 'Rol', value: `${role.name} (${role.id})`, inline: true },
          { name: 'İşlemi Yapan', value: `${mention(entry.executor.id)} (${entry.executor.id})`, inline: true }
        )
        .setTimestamp();
      
      await sendLog(role.guild, embed);
    }
  } catch (error) {
    console.error('Role create protection error:', error);
  }
});


client.on('roleUpdate', async (oldRole, newRole) => {
  if (!CONFIG.dangerousRoleGuard) return;
  
  try {
    if (CONFIG.forbiddenPermissions.some(perm => newRole.permissions.has(perm))) {
      await newRole.setPermissions(oldRole.permissions, 'Yasaklı izinler geri alındı').catch(() => {});
      
      const logs = await newRole.guild.fetchAuditLogs({
        type: AuditLogEvent.RoleUpdate,
        limit: 1
      }).catch(() => null);
      
      const entry = logs?.entries.first();
      if (!entry) return;
      
      if (addAction(entry.executor.id, 'permission', CONFIG.forbiddenPermissionLimit)) {
        await punishUser(newRole.guild, entry.executor.id, 'Yasaklı izin verme limiti aşıldı');
      }
      
      const embed = new EmbedBuilder()
        .setColor(0xffaa00)
        .setTitle('⚠️ Tehlikeli İzin Geri Alındı (Rol Güncelleme)')
        .addFields(
          { name: 'Rol', value: `${newRole.name} (${newRole.id})`, inline: true },
          { name: 'İşlemi Yapan', value: `${mention(entry.executor.id)} (${entry.executor.id})`, inline: true }
        )
        .setTimestamp();
      
      await sendLog(newRole.guild, embed);
    }
  } catch (error) {
    console.error('Role update protection error:', error);
  }
});


client.on('guildMemberAdd', async (member) => {
  if (!CONFIG.botAddProtection || !member.user.bot) return;
  
  try {
    const guild = member.guild;
    const logs = await guild.fetchAuditLogs({
      type: AuditLogEvent.BotAdd,
      limit: 1
    }).catch(() => null);
    
    const entry = logs?.entries.first();
    const executorId = entry?.executor?.id;
    if (!executorId) return;
    
    if (isWhitelisted(guild.id, executorId)) {
      const embed = new EmbedBuilder()
        .setColor(0x55ddaa)
        .setTitle('🤖 Bot Eklendi (Beyaz Liste)')
        .addFields(
          { name: 'Bot', value: `${mention(member.id)} (${member.id})`, inline: true },
          { name: 'Ekleyen', value: `${mention(executorId)} (${executorId})`, inline: true }
        )
        .setTimestamp();
      
      await sendLog(guild, embed);
      return;
    }
    
    
    await member.kick('Beyaz liste dışı bot ekleme').catch(() => {});
    await punishUser(guild, executorId, 'Beyaz liste dışı bot ekleme');
    
    const embed = new EmbedBuilder()
      .setColor(0xdd4444)
      .setTitle('⛔ Bot Ekleme Engellendi')
      .addFields(
        { name: 'Bot', value: `${mention(member.id)} (${member.id})`, inline: true },
        { name: 'Eklemeye Çalışan', value: `${mention(executorId)} (${executorId})`, inline: true }
      )
      .setTimestamp();
    
    await sendLog(guild, embed);
  } catch (error) {
    console.error('Bot add protection error:', error);
  }
});


client.on('guildBanAdd', async (ban) => {
  if (!CONFIG.boosterProtection && CONFIG.nonWhitelistBanLimit <= 0) return;
  
  try {
    const guild = ban.guild;
    const logs = await guild.fetchAuditLogs({
      type: AuditLogEvent.MemberBanAdd,
      limit: 1
    }).catch(() => null);
    
    const entry = logs?.entries.first();
    if (!entry) return;
    
    const executorId = entry.executor.id;
    const targetId = entry.target?.id;
    
    const member = await guild.members.fetch(targetId).catch(() => null);
    const isTargetBooster = !!member?.premiumSince;
    
    
    if (CONFIG.boosterProtection && isTargetBooster && !isWhitelisted(guild.id, executorId)) {
      await guild.members.unban(targetId, 'Booster koruması').catch(() => {});
      
      const logChannel = logChannel(guild);
      if (logChannel) {
        await logChannel.send({
          content: `${mention(executorId)} booster banlayamazsın. Tekrar denersen yaptırımlar uygulanır.`
        }).catch(() => {});
      }
      
      const embed = new EmbedBuilder()
        .setColor(0xffaa00)
        .setTitle('🛡️ Booster Koruması: Ban Geri Alındı')
        .addFields(
          { name: 'Hedef', value: `${mention(targetId)} (${targetId})`, inline: true },
          { name: 'Deneyen', value: `${mention(executorId)} (${executorId})`, inline: true }
        )
        .setTimestamp();
      
      await sendLog(guild, embed);
      return;
    }
    
    
    if (!isWhitelisted(guild.id, executorId)) {
      ensureGuildStructure(bancount, guild.id);
      const count = bancount.guilds[guild.id].count;
      count[executorId] = (count[executorId] || 0) + 1;
      saveJSON(BANCOUNT_FILE, bancount);
      
      if (count[executorId] === 1) {
        const logChannel = logChannel(guild);
        if (logChannel) {
          await logChannel.send({
            content: `${mention(executorId)} uyarı: Bir kişiyi banladın. Bir kişi daha banlarsan tüm rollerin alınacak.`
          }).catch(() => {});
        }
      } else if (count[executorId] >= CONFIG.nonWhitelistBanLimit) {
        await punishUser(guild, executorId, 'Ban limiti aşıldı');
        count[executorId] = 0; 
        saveJSON(BANCOUNT_FILE, bancount);
      }
    }
    
    
    const embed = new EmbedBuilder()
      .setColor(0xcc3333)
      .setTitle('🔨 Ban (Event)')
      .addFields(
        { name: 'Hedef', value: `${mention(targetId)} (${targetId})`, inline: true },
        { name: 'Yapan', value: `${mention(executorId)} (${executorId})`, inline: true }
      )
      .setTimestamp();
    
    await sendLog(guild, embed);
  } catch (error) {
    console.error('Ban add protection error:', error);
  }
});


client.on('guildUpdate', async (oldGuild, newGuild) => {
  if (!CONFIG.vanityProtection) return;
  
  try {
    ensureGuildStructure(vanityStore, newGuild.id);
    
    
    if (!vanityStore.guilds[newGuild.id].vanity && newGuild.vanityURLCode) {
      vanityStore.guilds[newGuild.id].vanity = newGuild.vanityURLCode;
      saveJSON(VANITY_FILE, vanityStore);
    }
    
    
    if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
      const logs = await newGuild.fetchAuditLogs({
        type: AuditLogEvent.GuildUpdate,
        limit: 5
      }).catch(() => null);
      
      const entry = logs?.entries.find(e => 
        e.changes?.some(change => change.key === 'vanity_url_code')
      ) || logs?.entries.first();
      
      const executorId = entry?.executor?.id;
      const original = vanityStore.guilds[newGuild.id].vanity || oldGuild.vanityURLCode;
      
      
      if (executorId && executorId !== CONFIG.ownerID) {
        await newGuild.setVanityCode(original).catch(() => {});
        
        const member = await newGuild.members.fetch(executorId).catch(() => null);
        if (member) {
          await member.ban({ reason: 'Vanity URL koruma' }).catch(() => {});
        }
        
        const embed = new EmbedBuilder()
          .setColor(0xdd4444)
          .setTitle('🔒 Vanity URL Koruma')
          .setDescription(`Vanity URL izinsiz değiştirildi, **eski haline getirildi** ve ${mention(executorId)} banlandı.`)
          .setTimestamp();
        
        const logChannel = logChannel(newGuild);
        if (logChannel) {
          await logChannel.send({ embeds: [embed] }).catch(() => {});
        }
      } else {
        
        vanityStore.guilds[newGuild.id].vanity = newGuild.vanityURLCode;
        saveJSON(VANITY_FILE, vanityStore);
        
        const embed = new EmbedBuilder()
          .setColor(0x55ddaa)
          .setTitle('🔧 Vanity URL Güncellendi')
          .addFields(
            { name: 'Eski', value: `${oldGuild.vanityURLCode || '—'}`, inline: true },
            { name: 'Yeni', value: `${newGuild.vanityURLCode || '—'}`, inline: true },
            { name: 'Yetkili', value: executorId ? `${mention(executorId)} (${executorId})` : 'Bilinmiyor', inline: false }
          )
          .setTimestamp();
        
        await sendLog(newGuild, embed);
      }
    }
  } catch (error) {
    console.error('Vanity URL protection error:', error);
  }
});


client.on('webhookUpdate', async (channel) => {
  if (!CONFIG.webhookProtection) return;
  
  try {
    const guild = channel.guild;
    const logs = await guild.fetchAuditLogs({
      type: AuditLogEvent.WebhookCreate,
      limit: 1
    }).catch(() => null);
    
    const entry = logs?.entries.first();
    if (!entry) return;
    
    if (!isWhitelisted(guild.id, entry.executor.id)) {
      
      const webhooks = await channel.fetchWebhooks();
      for (const webhook of webhooks.values()) {
        await webhook.delete().catch(() => {});
      }
      
      await punishUser(guild, entry.executor.id, 'İzinsiz webhook oluşturma');
      
      const embed = new EmbedBuilder()
        .setColor(0xdd4444)
        .setTitle('⛔ Webhook Oluşturma Engellendi')
        .addFields(
          { name: 'Kanal', value: `${channel.name} (${channel.id})`, inline: true },
          { name: 'Yapan', value: `${mention(entry.executor.id)} (${entry.executor.id})`, inline: true }
        )
        .setTimestamp();
      
      await sendLog(guild, embed);
    }
  } catch (error) {
    console.error('Webhook protection error:', error);
  }
});


setInterval(async () => {
  try {
    for (const [guildId, guild] of client.guilds.cache) {
      ensureGuildStructure(mutes, guildId);
      const records = mutes.guilds[guildId].records || {};
      
      for (const [userId, data] of Object.entries(records)) {
        if (data.endTime && Date.now() >= data.endTime) {
          await removeMute(guild, null, userId, 'Süre doldu (otomatik)');
        }
      }
    }
  } catch (error) {
    console.error('Mute check interval error:', error);
  }
}, 30 * 1000);


client.login(process.env.TOKEN).catch(error => {
  console.error('Login failed:', error);
});