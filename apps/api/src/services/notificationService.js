/**
 * 📬 Notification Service
 * FASE 5: Serviço de notificações multi-canal
 * Suporta: Email, SMS, WhatsApp, Push Notifications
 */

const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const Twilio = require("twilio");
const { db } = require("../config/database");
const Queue = require("bull");
const Redis = require("ioredis");

// Inicializar Firebase Admin (FASE 5.4)
let firebaseInitialized = false;
if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
    firebaseInitialized = true;
    console.log("✅ Firebase Admin inicializado");
  } catch (error) {
    console.warn("⚠️  Firebase não configurado:", error.message);
  }
}

// Inicializar Twilio (FASE 5.2, 5.3)
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
    console.log("✅ Twilio inicializado");
  } catch (error) {
    console.warn("⚠️  Twilio não configurado:", error.message);
  }
}

// Configurar Nodemailer (Email)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Inicializar fila de notificações com Bull (FASE 5.6)
const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined,
};

const notificationQueue = new Queue("notifications", {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

// Processar jobs da fila
notificationQueue.process("send-notification", async (job) => {
  const { channel, recipient, notification } = job.data;

  try {
    switch (channel) {
      case "email":
        return await sendEmail(recipient, notification.subject, notification.html);
      case "sms":
        return await sendSMS(recipient, notification.message);
      case "whatsapp":
        return await sendWhatsApp(recipient, notification.message);
      case "push":
        return await sendPushNotification(recipient, notification.title, notification.body, notification.data);
      default:
        throw new Error(`Canal não suportado: ${channel}`);
    }
  } catch (error) {
    console.error(`❌ Erro ao enviar ${channel}:`, error);
    throw error;
  }
});

/**
 * Enviar notificação push via Firebase (FASE 5.4)
 * @param {string} token - FCM token
 * @param {string} title - Título da notificação
 * @param {string} body - Corpo da notificação
 * @param {Object} data - Dados adicionais
 */
async function sendPushNotification(token, title, body, data = {}) {
  if (!firebaseInitialized) {
    console.warn("⚠️  Firebase não inicializado, pulando push notification");
    return { success: false, error: "Firebase não configurado" };
  }

  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        type: data.type || "general",
      },
      token,
    };

    const response = await admin.messaging().send(message);
    return { success: true, messageId: response };
  } catch (error) {
    console.error("❌ Erro ao enviar push:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Enviar push para múltiplos usuários
 * @param {Array<number>} userIds - IDs dos usuários
 * @param {string} title - Título
 * @param {string} body - Corpo
 * @param {Object} data - Dados adicionais
 */
async function sendPushToMultipleUsers(userIds, title, body, data = {}) {
  try {
    for (const userId of userIds) {
      const tokens = await db("user_fcm_tokens")
        .where("user_id", userId)
        .where("active", true)
        .pluck("token");

      for (const token of tokens) {
        await sendPushNotification(token, title, body, data);
      }
    }
    return { success: true };
  } catch (error) {
    console.error("❌ Erro ao enviar push múltiplo:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Enviar email (FASE 5.5 - Templates)
 * @param {string} to - Email do destinatário
 * @param {string} subject - Assunto
 * @param {string} htmlContent - Conteúdo HTML
 */
async function sendEmail(to, subject, htmlContent) {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Erro ao enviar email:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Enviar SMS via Twilio (FASE 5.2)
 * @param {string} to - Número de telefone
 * @param {string} message - Mensagem
 */
async function sendSMS(to, message) {
  if (!twilioClient) {
    console.warn("⚠️  Twilio não configurado, pulando SMS");
    return { success: false, error: "Twilio não configurado" };
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });

    return { success: true, messageId: result.sid };
  } catch (error) {
    console.error("❌ Erro ao enviar SMS:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Enviar WhatsApp via Twilio (FASE 5.3)
 * @param {string} to - Número de telefone
 * @param {string} message - Mensagem
 */
async function sendWhatsApp(to, message) {
  if (!twilioClient) {
    console.warn("⚠️  Twilio não configurado, pulando WhatsApp");
    return { success: false, error: "Twilio não configurado" };
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_WHATSAPP_NUMBER || `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:${to}`,
    });

    return { success: true, messageId: result.sid };
  } catch (error) {
    console.error("❌ Erro ao enviar WhatsApp:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Adicionar notificação à fila (FASE 5.6)
 * @param {string} channel - Canal (email, sms, whatsapp, push)
 * @param {string} recipient - Destinatário
 * @param {Object} notification - Dados da notificação
 * @param {Object} options - Opções do job
 */
async function queueNotification(channel, recipient, notification, options = {}) {
  try {
    const job = await notificationQueue.add(
      "send-notification",
      {
        channel,
        recipient,
        notification,
      },
      {
        priority: options.priority || 0,
        delay: options.delay || 0,
        ...options,
      },
    );

    return { success: true, jobId: job.id };
  } catch (error) {
    console.error("❌ Erro ao adicionar à fila:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Templates de notificação (FASE 5.5)
 */
const templates = {
  bookingConfirmed: (booking) => ({
    email: {
      subject: "✅ Reserva Confirmada!",
      html: `
        <h2>Reserva Confirmada!</h2>
        <p>Sua reserva #${booking.booking_number} foi confirmada com sucesso.</p>
        <p><strong>Propriedade:</strong> ${booking.property_title || "N/A"}</p>
        <p><strong>Check-in:</strong> ${new Date(booking.check_in).toLocaleDateString("pt-BR")}</p>
        <p><strong>Check-out:</strong> ${new Date(booking.check_out).toLocaleDateString("pt-BR")}</p>
        <p><strong>Valor Total:</strong> R$ ${parseFloat(booking.total_amount || 0).toFixed(2)}</p>
        <p>---</p>
        <small>RSV 360° Sistema de Reservas</small>
      `,
    },
    sms: `✅ Reserva #${booking.booking_number} confirmada! Check-in: ${new Date(booking.check_in).toLocaleDateString("pt-BR")}. RSV 360°`,
    whatsapp: `✅ Reserva Confirmada!\n\nReserva: #${booking.booking_number}\nPropriedade: ${booking.property_title || "N/A"}\nCheck-in: ${new Date(booking.check_in).toLocaleDateString("pt-BR")}\nCheck-out: ${new Date(booking.check_out).toLocaleDateString("pt-BR")}\nTotal: R$ ${parseFloat(booking.total_amount || 0).toFixed(2)}\n\nRSV 360°`,
    push: {
      title: "✅ Reserva Confirmada",
      body: `Reserva #${booking.booking_number} confirmada`,
      data: {
        type: "booking_confirmed",
        bookingId: booking.id,
      },
    },
  }),

  bookingCancelled: (booking, reason = "") => ({
    email: {
      subject: "❌ Reserva Cancelada",
      html: `
        <h2>Reserva Cancelada</h2>
        <p>Sua reserva #${booking.booking_number} foi cancelada.</p>
        ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ""}
        <p>Para mais informações, entre em contato com nosso suporte.</p>
        <p>---</p>
        <small>RSV 360° Sistema de Reservas</small>
      `,
    },
    sms: `❌ Reserva #${booking.booking_number} cancelada. Contato suporte para mais detalhes. RSV 360°`,
    whatsapp: `❌ Reserva Cancelada\n\nReserva: #${booking.booking_number}\n${reason ? `Motivo: ${reason}` : "Contato com suporte para mais detalhes"}\n\nRSV 360°`,
    push: {
      title: "❌ Reserva Cancelada",
      body: `Reserva #${booking.booking_number} cancelada`,
      data: {
        type: "booking_cancelled",
        bookingId: booking.id,
      },
    },
  }),

  checkInReminder: (booking) => ({
    email: {
      subject: "⏰ Lembrete: Check-in Amanhã!",
      html: `
        <h2>Lembrete de Check-in Amanhã!</h2>
        <p>Sua reserva #${booking.booking_number} tem check-in amanhã às 14:00.</p>
        <p><strong>Propriedade:</strong> ${booking.property_title || "N/A"}</p>
        <p>Prepare-se para sua estadia!</p>
        <p>---</p>
        <small>RSV 360° Sistema de Reservas</small>
      `,
    },
    sms: `⏰ Lembrete: Check-in amanhã às 14:00. Reserva #${booking.booking_number}. RSV 360°`,
    whatsapp: `⏰ Lembrete: Check-in amanhã!\n\nReserva: #${booking.booking_number}\nPropriedade: ${booking.property_title || "N/A"}\nHora: 14:00\n\nRSV 360°`,
    push: {
      title: "⏰ Check-in Amanhã",
      body: `Reserva #${booking.booking_number} - Check-in às 14:00`,
      data: {
        type: "checkin_reminder",
        bookingId: booking.id,
      },
    },
  }),

  paymentConfirmed: (payment) => ({
    email: {
      subject: "💳 Pagamento Confirmado!",
      html: `
        <h2>Pagamento Confirmado!</h2>
        <p>Seu pagamento foi processado com sucesso.</p>
        <p><strong>Valor:</strong> R$ ${parseFloat(payment.amount || 0).toFixed(2)}</p>
        <p><strong>Transação:</strong> #${payment.transaction_id || "N/A"}</p>
        <p><strong>Data:</strong> ${new Date().toLocaleDateString("pt-BR")}</p>
        <p>---</p>
        <small>RSV 360° Sistema de Reservas</small>
      `,
    },
    sms: `💳 Pagamento de R$ ${parseFloat(payment.amount || 0).toFixed(2)} confirmado. Transação #${payment.transaction_id || "N/A"}. RSV 360°`,
    whatsapp: `💳 Pagamento Confirmado!\n\nValor: R$ ${parseFloat(payment.amount || 0).toFixed(2)}\nTransação: #${payment.transaction_id || "N/A"}\nData: ${new Date().toLocaleDateString("pt-BR")}\n\nRSV 360°`,
    push: {
      title: "💳 Pagamento Confirmado",
      body: `R$ ${parseFloat(payment.amount || 0).toFixed(2)} processado`,
      data: {
        type: "payment_confirmed",
        paymentId: payment.id,
      },
    },
  }),
};

/**
 * Notificar confirmação de reserva
 * @param {number} bookingId - ID da reserva
 */
async function notifyBookingConfirmed(bookingId) {
  try {
    const booking = await db("bookings")
      .select(
        "bookings.*",
        "properties.title as property_title",
        "customers.email as customer_email",
        "customers.phone as customer_phone",
        "customers.user_id",
      )
      .leftJoin("properties", "bookings.property_id", "properties.id")
      .leftJoin("customers", "bookings.customer_id", "customers.id")
      .where("bookings.id", bookingId)
      .first();

    if (!booking) {
      return { success: false, error: "Reserva não encontrada" };
    }

    const template = templates.bookingConfirmed(booking);

    // Email
    if (booking.customer_email) {
      await queueNotification("email", booking.customer_email, template.email);
    }

    // SMS
    if (booking.customer_phone) {
      await queueNotification("sms", booking.customer_phone, { message: template.sms });
    }

    // WhatsApp
    if (booking.customer_phone) {
      await queueNotification("whatsapp", booking.customer_phone, { message: template.whatsapp });
    }

    // Push
    if (booking.user_id) {
      const tokens = await db("user_fcm_tokens")
        .where("user_id", booking.user_id)
        .where("active", true)
        .pluck("token");

      for (const token of tokens) {
        await queueNotification("push", token, template.push);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("❌ Erro ao notificar confirmação:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Notificar cancelamento de reserva
 * @param {number} bookingId - ID da reserva
 * @param {string} reason - Motivo do cancelamento
 */
async function notifyBookingCancelled(bookingId, reason = "") {
  try {
    const booking = await db("bookings")
      .select(
        "bookings.*",
        "properties.title as property_title",
        "customers.email as customer_email",
        "customers.phone as customer_phone",
        "customers.user_id",
      )
      .leftJoin("properties", "bookings.property_id", "properties.id")
      .leftJoin("customers", "bookings.customer_id", "customers.id")
      .where("bookings.id", bookingId)
      .first();

    if (!booking) {
      return { success: false, error: "Reserva não encontrada" };
    }

    const template = templates.bookingCancelled(booking, reason);

    // Email
    if (booking.customer_email) {
      await queueNotification("email", booking.customer_email, template.email);
    }

    // SMS
    if (booking.customer_phone) {
      await queueNotification("sms", booking.customer_phone, { message: template.sms });
    }

    // WhatsApp
    if (booking.customer_phone) {
      await queueNotification("whatsapp", booking.customer_phone, { message: template.whatsapp });
    }

    // Push
    if (booking.user_id) {
      const tokens = await db("user_fcm_tokens")
        .where("user_id", booking.user_id)
        .where("active", true)
        .pluck("token");

      for (const token of tokens) {
        await queueNotification("push", token, template.push);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("❌ Erro ao notificar cancelamento:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Notificar lembrete de check-in
 * @param {number} bookingId - ID da reserva
 */
async function notifyCheckInReminder(bookingId) {
  try {
    const booking = await db("bookings")
      .select(
        "bookings.*",
        "properties.title as property_title",
        "customers.email as customer_email",
        "customers.phone as customer_phone",
        "customers.user_id",
      )
      .leftJoin("properties", "bookings.property_id", "properties.id")
      .leftJoin("customers", "bookings.customer_id", "customers.id")
      .where("bookings.id", bookingId)
      .first();

    if (!booking) {
      return { success: false, error: "Reserva não encontrada" };
    }

    const template = templates.checkInReminder(booking);

    // Email
    if (booking.customer_email) {
      await queueNotification("email", booking.customer_email, template.email);
    }

    // SMS
    if (booking.customer_phone) {
      await queueNotification("sms", booking.customer_phone, { message: template.sms });
    }

    // WhatsApp
    if (booking.customer_phone) {
      await queueNotification("whatsapp", booking.customer_phone, { message: template.whatsapp });
    }

    // Push
    if (booking.user_id) {
      const tokens = await db("user_fcm_tokens")
        .where("user_id", booking.user_id)
        .where("active", true)
        .pluck("token");

      for (const token of tokens) {
        await queueNotification("push", token, template.push);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("❌ Erro ao enviar lembrete:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Notificar confirmação de pagamento
 * @param {number} paymentId - ID do pagamento
 */
async function notifyPaymentConfirmed(paymentId) {
  try {
    const payment = await db("payments")
      .select("payments.*", "customers.email as customer_email", "customers.phone as customer_phone", "customers.user_id")
      .leftJoin("bookings", "payments.booking_id", "bookings.id")
      .leftJoin("customers", "bookings.customer_id", "customers.id")
      .where("payments.id", paymentId)
      .first();

    if (!payment) {
      return { success: false, error: "Pagamento não encontrado" };
    }

    const template = templates.paymentConfirmed(payment);

    // Email
    if (payment.customer_email) {
      await queueNotification("email", payment.customer_email, template.email);
    }

    // SMS
    if (payment.customer_phone) {
      await queueNotification("sms", payment.customer_phone, { message: template.sms });
    }

    // WhatsApp
    if (payment.customer_phone) {
      await queueNotification("whatsapp", payment.customer_phone, { message: template.whatsapp });
    }

    // Push
    if (payment.user_id) {
      const tokens = await db("user_fcm_tokens")
        .where("user_id", payment.user_id)
        .where("active", true)
        .pluck("token");

      for (const token of tokens) {
        await queueNotification("push", token, template.push);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("❌ Erro ao notificar pagamento:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Notificar criação de split payment
 */
async function notifySplitPaymentCreated(splitId, userId) {
  try {
    const user = await db("users").where("id", userId).first();
    if (!user) return { success: false, error: "Usuário não encontrado" };

    const split = await db("payment_splits").where("id", splitId).first();
    if (!split) return { success: false, error: "Split não encontrado" };

    const booking = await db("bookings").where("id", split.booking_id).first();

    const notification = {
      email: {
        subject: "💰 Pagamento Dividido - RSV 360°",
        html: `
          <h2>Pagamento Dividido Criado</h2>
          <p>Um pagamento dividido foi criado para a reserva #${booking?.booking_number || split.booking_id}.</p>
          <p><strong>Seu valor:</strong> R$ ${parseFloat(split.amount || 0).toFixed(2)}</p>
          <p>Acesse sua conta para realizar o pagamento.</p>
          <p>---</p>
          <small>RSV 360° Sistema de Reservas</small>
        `,
      },
      push: {
        title: "💰 Pagamento Dividido",
        body: `Você tem um pagamento de R$ ${parseFloat(split.amount || 0).toFixed(2)} pendente`,
        data: { type: "split_payment_created", splitId, bookingId: split.booking_id },
      },
    };

    await queueNotification("email", user.email, notification);
    await sendPushToMultipleUsers([userId], notification.push.title, notification.push.body, notification.push.data);

    return { success: true };
  } catch (error) {
    console.error("❌ Erro ao notificar split payment:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Notificar pagamento de split
 */
async function notifySplitPaymentPaid(splitId, userId) {
  try {
    const user = await db("users").where("id", userId).first();
    if (!user) return { success: false, error: "Usuário não encontrado" };

    const notification = {
      email: {
        subject: "✅ Pagamento Confirmado - RSV 360°",
        html: `
          <h2>Pagamento Confirmado</h2>
          <p>Seu pagamento dividido foi confirmado com sucesso!</p>
          <p>---</p>
          <small>RSV 360° Sistema de Reservas</small>
        `,
      },
      push: {
        title: "✅ Pagamento Confirmado",
        body: "Seu pagamento dividido foi confirmado",
        data: { type: "split_payment_paid", splitId },
      },
    };

    await queueNotification("email", user.email, notification);
    await sendPushToMultipleUsers([userId], notification.push.title, notification.push.body, notification.push.data);

    return { success: true };
  } catch (error) {
    console.error("❌ Erro ao notificar pagamento de split:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Notificar convite de viagem
 */
async function notifyTripInvitation(invitationId, email, data = {}) {
  try {
    const invitation = await db("trip_invitations").where("id", invitationId).first();
    if (!invitation) return { success: false, error: "Convite não encontrado" };

    const booking = await db("bookings").where("id", invitation.booking_id).first();
    const inviter = await db("users").where("id", invitation.invited_by).first();

    const acceptUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/trip-invitations/accept?token=${invitation.token}`;

    const notification = {
      email: {
        subject: "✉️ Convite para Viagem - RSV 360°",
        html: `
          <h2>Você foi convidado para uma viagem!</h2>
          <p><strong>${inviter?.name || 'Alguém'}</strong> te convidou para uma viagem.</p>
          ${booking ? `
            <p><strong>Check-in:</strong> ${new Date(booking.check_in_date).toLocaleDateString("pt-BR")}</p>
            <p><strong>Check-out:</strong> ${new Date(booking.check_out_date).toLocaleDateString("pt-BR")}</p>
          ` : ''}
          ${data.message ? `<p><strong>Mensagem:</strong> ${data.message}</p>` : ''}
          <p><a href="${acceptUrl}">Aceitar Convite</a></p>
          <p>---</p>
          <small>RSV 360° Sistema de Reservas</small>
        `,
      },
    };

    await queueNotification("email", email, notification);

    return { success: true };
  } catch (error) {
    console.error("❌ Erro ao notificar convite:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Notificar convite para wishlist
 */
async function notifyWishlistInvitation(wishlistId, userId) {
  try {
    const user = await db("users").where("id", userId).first();
    if (!user) return { success: false, error: "Usuário não encontrado" };

    const wishlist = await db("shared_wishlists").where("id", wishlistId).first();
    if (!wishlist) return { success: false, error: "Wishlist não encontrada" };

    const notification = {
      email: {
        subject: "📋 Convite para Wishlist - RSV 360°",
        html: `
          <h2>Você foi convidado para uma Wishlist!</h2>
          <p>Você foi adicionado à wishlist <strong>${wishlist.name}</strong>.</p>
          <p>Acesse sua conta para ver os itens e votar nas suas propriedades favoritas.</p>
          <p>---</p>
          <small>RSV 360° Sistema de Reservas</small>
        `,
      },
      push: {
        title: "📋 Novo Convite para Wishlist",
        body: `Você foi adicionado à wishlist "${wishlist.name}"`,
        data: { type: "wishlist_invitation", wishlistId },
      },
    };

    await queueNotification("email", user.email, notification);
    await sendPushToMultipleUsers([userId], notification.push.title, notification.push.body, notification.push.data);

    return { success: true };
  } catch (error) {
    console.error("❌ Erro ao notificar wishlist:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Notificar nova mensagem no chat em grupo
 */
async function notifyGroupChatMessage(userId, data = {}) {
  try {
    const user = await db("users").where("id", userId).first();
    if (!user) return { success: false, error: "Usuário não encontrado" };

    const notification = {
      push: {
        title: `💬 Nova mensagem de ${data.senderName || 'Alguém'}`,
        body: data.message || "Nova mensagem no chat",
        data: { type: "group_chat_message", chatId: data.chatId, messageId: data.messageId },
      },
    };

    await sendPushToMultipleUsers([userId], notification.push.title, notification.push.body, notification.push.data);

    return { success: true };
  } catch (error) {
    console.error("❌ Erro ao notificar mensagem do chat:", error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  // Funções básicas
  sendPushNotification,
  sendPushToMultipleUsers,
  sendEmail,
  sendSMS,
  sendWhatsApp,
  queueNotification,

  // Notificações específicas
  notifyBookingConfirmed,
  notifyBookingCancelled,
  notifyCheckInReminder,
  notifyPaymentConfirmed,

  // Notificações Group Travel
  notifySplitPaymentCreated,
  notifySplitPaymentPaid,
  notifyTripInvitation,
  notifyWishlistInvitation,
  notifyGroupChatMessage,

  // Templates
  templates,

  // Fila
  notificationQueue,
};

