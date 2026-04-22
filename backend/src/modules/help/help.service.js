/**
 * Help Service
 * Static content + contact request persistence
 */

'use strict';

const { Op } = require('sequelize');
const { ValidationError } = require('../../shared/errors');
const logger = require('../../shared/utils/logger');

// Max contact submissions per email address within the spam window
const SPAM_WINDOW_HOURS = 1;
const SPAM_MAX_REQUESTS = 3;

// ─── Static FAQ content ───────────────────────────────────
// Phase 7: migrate to DB table help_articles
const CATEGORIES = [
  { id: 'start',     title: 'Primeiros passos',   icon: 'fas fa-rocket',        article_count: 8 },
  { id: 'appts',     title: 'Agendamentos',        icon: 'fas fa-calendar-alt',  article_count: 12 },
  { id: 'clients',   title: 'Clientes',            icon: 'fas fa-users',         article_count: 7 },
  { id: 'finance',   title: 'Financeiro',          icon: 'fas fa-dollar-sign',   article_count: 9 },
  { id: 'billing',   title: 'Assinatura',          icon: 'fas fa-credit-card',   article_count: 5 },
  { id: 'team',      title: 'Equipe',              icon: 'fas fa-user-tie',      article_count: 6 },
  { id: 'marketing', title: 'Marketing',           icon: 'fas fa-bullhorn',      article_count: 4 },
  { id: 'account',   title: 'Conta & Configurações',icon: 'fas fa-cog',          article_count: 6 },
];

const FAQ = [
  { id: 'faq-1', category: 'appts',    question: 'Como adicionar um novo agendamento?',           answer: 'Acesse "Agendamentos" na barra lateral, clique em "Novo agendamento" ou no botão "+". Preencha cliente, serviço, profissional e horário.' },
  { id: 'faq-2', category: 'team',     question: 'Como cadastrar um profissional?',               answer: 'Vá em "Profissionais" no menu lateral, clique em "Adicionar profissional". O sistema enviará um convite por e-mail.' },
  { id: 'faq-3', category: 'billing',  question: 'Posso cancelar minha assinatura a qualquer momento?', answer: 'Sim. Acesse "Assinatura" → "Gerenciar assinatura". Seus dados ficam disponíveis por 30 dias após o cancelamento.' },
  { id: 'faq-4', category: 'billing',  question: 'Como funciona o período de teste?',             answer: 'Você tem 14 dias para explorar todas as funcionalidades gratuitamente, sem inserir cartão de crédito.' },
  { id: 'faq-5', category: 'clients',  question: 'Como exportar os dados dos clientes?',         answer: 'Acesse "Clientes" e clique no ícone de exportação (planilha) no canto superior direito. Os dados são exportados em CSV.' },
  { id: 'faq-6', category: 'start',    question: 'Como configurar os serviços do salão?',        answer: 'Acesse "Serviços" no menu lateral. Clique em "Adicionar serviço" e defina nome, duração, valor e profissionais.' },
  { id: 'faq-7', category: 'finance',  question: 'Como ver o relatório financeiro do mês?',      answer: 'Acesse "Financeiro" → "Relatórios". Selecione o período para ver receitas, despesas, comissões e saldo.' },
  { id: 'faq-8', category: 'account',  question: 'É possível ter múltiplos usuários com acessos diferentes?', answer: 'Sim. Em "Usuários" convide membros com papel Proprietário, Administrador ou Profissional.' },
];

class HelpService {
  constructor(models) {
    this.ContactRequest = models.HelpContactRequest;
  }

  getCategories() {
    return CATEGORIES;
  }

  getFaq({ category } = {}) {
    if (category) return FAQ.filter(f => f.category === category);
    return FAQ;
  }

  async submitContact(tenantId, userId, data) {
    const { name, email, subject, category, message } = data;

    // Basic spam guard: limit submissions per email per hour
    await this._checkSpam(email);

    const record = await this.ContactRequest.create({
      tenant_id: tenantId || null,
      user_id:   userId   || null,
      name:      name.trim(),
      email:     email.toLowerCase().trim(),
      subject:   subject.trim(),
      category:  category || null,
      message:   message.trim(),
      status:    'open',
    });

    logger.info('[Help] Contact request created', { id: record.id, tenantId, email: record.email });

    return {
      id:         record.id,
      status:     record.status,
      message:    'Mensagem recebida. Responderemos em breve.',
      created_at: record.created_at,
    };
  }

  // ─── PRIVATE ─────────────────────────────────────────────

  async _checkSpam(email) {
    const since = new Date(Date.now() - SPAM_WINDOW_HOURS * 60 * 60 * 1000);
    const count = await this.ContactRequest.count({
      where: {
        email:      email.toLowerCase().trim(),
        created_at: { [Op.gte]: since },
      },
    });
    if (count >= SPAM_MAX_REQUESTS) {
      throw new ValidationError(
        `Limite de ${SPAM_MAX_REQUESTS} mensagens por hora atingido. Tente novamente mais tarde.`
      );
    }
  }
}

module.exports = HelpService;
