# Pré-lançamento Seguro do Meus Condomínios

Este checklist reduz riscos antes do lançamento comercial. Ele não substitui revisão jurídica, contábil, tributária ou de segurança por profissionais responsáveis.

## Privacidade e LGPD

- [ ] Revisar Termos, Privacidade, Cookies e LGPD com assessoria jurídica.
- [ ] Definir, por contrato, quando o condomínio atua como controlador e quando o Meus Condomínios atua como operador.
- [ ] Publicar canal de contato para acesso, correção, exportação, exclusão e denúncia.
- [ ] Criar rotina interna para responder pedidos de titulares.
- [ ] Validar que telefone fica oculto por padrão.
- [ ] Validar que morador pendente não acessa dados internos.

## Cadastro e consentimento

- [x] Cadastro exige aceite de Termos de Uso e Política de Privacidade.
- [x] Cadastro possui verificação anti-bot.
- [ ] Produção deve usar captcha real, como Cloudflare Turnstile.
- [ ] Registrar data/hora do aceite no provedor de autenticação ou tabela própria.
- [ ] Revisar telas de convite de morador, síndico, guarita e admin.

## WhatsApp

- [ ] Envio automático apenas com plano elegível.
- [ ] Opt-in obrigatório antes de mensagem automática.
- [ ] Opt-out disponível ao morador.
- [ ] Créditos e limites mensais aplicados no backend.
- [ ] Grupo automático apenas quando elegível, configurado e permitido pelo plano ou add-on.
- [ ] Mensagens sensíveis bloqueadas em grupos.
- [ ] Textos comerciais deixam claro que WhatsApp depende de configuração, consentimento, créditos e regras da plataforma oficial.

## QR público e visitantes

- [ ] QR público não lista apartamentos.
- [ ] QR público não lista moradores.
- [ ] QR público não mostra telefone.
- [ ] Mensagens públicas são genéricas.
- [ ] Rate limit ativo.
- [ ] Logs de tentativa ativos.
- [ ] Bloqueio temporário após abuso.

## Segurança de dados

- [ ] RLS ativa em todas as tabelas internas.
- [ ] Policies testadas por papel.
- [ ] Dados sempre vinculados a `condominium_id` quando fizer sentido.
- [ ] Service role nunca aparece no frontend.
- [ ] Storage privado para documentos e anexos.
- [ ] Upload com limite de tamanho, tipo e plano.
- [ ] Erros não revelam detalhes internos.
- [ ] Ações sensíveis geram audit log.

## Permissões por cargo

- [ ] `subscriber_admin` tem acesso total e não pode ser limitado.
- [ ] Síndico respeita toggles.
- [ ] Admin adicional não remove assinante principal.
- [ ] Guarita vê apenas fluxo operacional autorizado.
- [ ] Morador vê apenas dados próprios e informações gerais permitidas.
- [ ] Proprietário não vê dados de outros apartamentos.

## Planos, limites e cobrança

- [ ] Plano grátis bloqueia recursos pagos no backend.
- [ ] Aviso aos 80% de limite.
- [ ] Bloqueio ao atingir 100%.
- [ ] Política de cancelamento e reembolso revisada.
- [ ] Gateway de pagamento testado antes de cobrança real.
- [ ] Add-ons de WhatsApp/canais documentados.

## Comunicação pública e marketing

- [ ] Remover promessas absolutas de segurança, conformidade jurídica automática ou disponibilidade sem limite.
- [ ] Usar linguagem como "projetado com boas práticas" e "recursos para apoiar privacidade".
- [ ] Explicar que WhatsApp depende de consentimento, créditos, configuração e regras da plataforma oficial.
- [ ] Evitar expor fornecedores técnicos desnecessariamente em páginas comerciais.

## AdSense e cookies

- [ ] AdSense só no plano grátis.
- [ ] AdSense apenas com consentimento quando aplicável.
- [ ] AdSense não aparece em login, cadastro, páginas legais, QR público ou telas sensíveis.
- [ ] Preferências de cookies podem ser alteradas depois.

## Riscos restantes

- Conformidade jurídica depende do uso real do condomínio e revisão especializada.
- WhatsApp oficial depende de aprovação e regras da plataforma.
- Pagamentos, reembolsos e emissão fiscal precisam de fluxo real antes de escala.
- Testes automatizados por papel ainda são recomendados.
- Monitoramento de produção deve ser configurado antes de tráfego real.
