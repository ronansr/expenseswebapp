import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  CreditCard,
  LifeBuoy,
  Moon,
  Sun,
  Target,
  Users,
  Wallet,
} from 'lucide-react';
import {KpiCard} from '../overview/KpiCard';
import {CashflowChart} from '../../components/charts/CashflowChart';
import {CategoryDonut} from '../../components/charts/CategoryDonut';
import {DEMO_CATEGORIES, DEMO_FLOW, DEMO_TOTAL} from './demoData';
import {useReveal} from '../../hooks/useReveal';
import type {Theme} from '../../hooks/useTheme';

type Props = {
  theme: Theme;
  onToggleTheme: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
};

const FAQ = [
  {
    q: 'Emprestei meu cartão. Como separo o gasto que não é meu?',
    a: 'Cadastre a pessoa uma vez. Ao lançar a despesa, escolha o nome dela: o valor sai dos seus totais e vira crédito a receber. Quando ela devolver o dinheiro, cadastre a entrada marcando a mesma pessoa, e a dívida abate.',
  },
  {
    q: 'O dinheiro guardado em metas continua no saldo do mês?',
    a: 'Não. O aporte desconta do saldo disponível no dia em que você guardou, do mesmo jeito que uma conta. É por isso que o saldo do fim do mês passa a refletir o que você pode gastar de verdade.',
  },
  {
    q: 'Para que serve a reserva de emergência?',
    a: 'Ela é um caixa à parte. Quando o mês fecha no vermelho, o SobControle mostra quanto falta e quanto a reserva cobre. O resgate volta para o saldo do mês em que você o fez.',
  },
  {
    q: 'Onde os meus dados ficam guardados?',
    a: 'No projeto Supabase configurado nas variáveis de ambiente da aplicação. A autenticação é a do seu projeto, e nenhum servidor intermediário guarda cópia.',
  },
  {
    q: 'Dá para usar no celular?',
    a: 'Sim. O painel se reorganiza em coluna única, a navegação vai para a barra inferior e o botão central abre o lançamento rápido.',
  },
];

export const LandingPage = ({theme, onToggleTheme, onSignIn, onSignUp}: Props) => {
  const rootRef = useReveal<HTMLDivElement>();

  return (
    <div className="lp" ref={rootRef}>
      <header className="lp-nav">
        <div className="lp-wrap lp-nav-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true"><Wallet size={19} /></span>
            <span className="brand-name">SobControle</span>
          </div>
          <nav className="lp-nav-links" aria-label="Secoes da página">
            <a href="#recursos">Recursos</a>
            <a href="#fluxo">Como funciona</a>
            <a href="#perguntas">Perguntas</a>
          </nav>
          <div className="lp-nav-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}>
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onSignIn}>Entrar</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={onSignUp}>Criar conta</button>
          </div>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-wrap lp-hero-grid">
            <div>
              <h1>Saiba hoje como o mês vai terminar.</h1>
              <p className="lp-sub">
                Veja o saldo de cada dia, separe o que você pagou pelos outros e guarde o que sobra.
              </p>
              <div className="lp-cta">
                <button type="button" className="btn btn-primary" onClick={onSignUp}>Criar conta</button>
                <button type="button" className="btn btn-ghost" onClick={onSignIn}>Entrar</button>
              </div>
            </div>

            {/* Prévia real: os mesmos componentes do painel, com dados de exemplo. */}
            <div className="lp-preview" aria-label="Prévia do painel">
              <div className="lp-preview-head">
                <strong>Agosto</strong>
                <span>dados de exemplo</span>
              </div>
              <div className="lp-preview-kpis">
                <KpiCard label="Saldo" value={7840.5} icon={Wallet} tone="good" />
                <KpiCard label="Entradas" value={9500} icon={ArrowDownLeft} tone="info" />
                <KpiCard label="Saídas" value={4280} icon={ArrowUpRight} tone="bad" />
                <KpiCard label="A pagar" value={2140} icon={CreditCard} tone="warn" />
              </div>
              <div className="card card-pad">
                <CashflowChart flow={DEMO_FLOW} mesLabel="agosto" />
              </div>
            </div>
          </div>
        </section>

        <section className="lp-section" id="recursos">
          <div className="lp-wrap">
            <p className="lp-eyebrow">Recursos</p>
            <h2>O mês tem mais dono do que parece.</h2>
            <p>Separe o seu dinheiro do dinheiro que só passou pela sua conta, e guarde o que sobrar.</p>

            <div className="lp-bento">
              <article className="lp-tile lp-reveal">
                <span className="lp-tile-icon" aria-hidden="true"><Wallet size={18} /></span>
                <h3>Saldo projetado dia a dia</h3>
                <p>
                  A linha acumula entradas e vencimentos na ordem do calendário. O vale entre o dia 20 e o
                  fim do mês aparece antes de virar problema.
                </p>
                <div className="lp-tile-figure">
                  <CategoryDonut slices={DEMO_CATEGORIES} total={DEMO_TOTAL} />
                </div>
              </article>

              <article className="lp-tile lp-tile-accent lp-reveal">
                <span className="lp-tile-icon" aria-hidden="true"><Users size={18} /></span>
                <h3>O que é seu e o que é dos outros</h3>
                <p>
                  Marque quem usou o cartão. A despesa sai dos seus totais e entra no extrato da pessoa,
                  até ela devolver.
                </p>
                <div className="lp-mini">
                  <div className="lp-mini-row"><span>Marina, 3 lançamentos</span><b>R$ 418,70</b></div>
                  <div className="lp-mini-row"><span>Téo, 1 lançamento</span><b>R$ 189,90</b></div>
                  <div className="lp-mini-row"><span>Devolvido em agosto</span><b>R$ 260,00</b></div>
                </div>
              </article>

              <article className="lp-tile lp-reveal">
                <span className="lp-tile-icon" aria-hidden="true"><Target size={18} /></span>
                <h3>Metas que saem do bolso</h3>
                <p>
                  Guardar para a viagem desconta do saldo do mês, e não do saldo imaginário. O progresso de
                  cada objetivo fica na visão geral.
                </p>
              </article>

              <article className="lp-tile lp-reveal">
                <span className="lp-tile-icon" aria-hidden="true"><LifeBuoy size={18} /></span>
                <h3>Reserva de emergência como caixa</h3>
                <p>
                  Quando o mês fecha no vermelho, você vê quanto falta e quanto a reserva cobre. O resgate
                  devolve o valor ao saldo daquele mês, com a data registrada.
                </p>
              </article>

              <article className="lp-tile lp-reveal">
                <span className="lp-tile-icon" aria-hidden="true"><CalendarDays size={18} /></span>
                <h3>Contas fixas, parcelas e calendário</h3>
                <p>Lançou uma vez, os meses seguintes já abrem preenchidos.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="lp-section" id="fluxo">
          <div className="lp-wrap">
            <h2>Do primeiro lançamento ao mês fechado.</h2>
            <div className="lp-steps">
              <article className="lp-step lp-reveal">
                <h3>Cadastre o que entra</h3>
                <p>Salário, freelas, aluguel recebido. Cada entrada tem um dia, e e esse dia que a projecao usa.</p>
              </article>
              <article className="lp-step lp-reveal">
                <h3>Lance as contas do mês</h3>
                <p>À vista, parcelado ou recorrente. Se a conta é de outra pessoa, escolha o nome dela no formulário.</p>
              </article>
              <article className="lp-step lp-reveal">
                <h3>Marque o que foi pago</h3>
                <p>O saldo acompanha os pagamentos. O que ficou em aberto e o que é de terceiro seguem em contas separadas.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="lp-section" id="perguntas">
          <div className="lp-wrap">
            <h2>Perguntas frequentes</h2>
            <div className="lp-faq">
              {FAQ.map(item => (
                <details key={item.q}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <div className="lp-wrap">
          <section className="lp-final lp-reveal">
            <h2>Comece pelo mês que você está vivendo agora.</h2>
            <p>Cadastre as entradas, lance as contas e descubra quanto do mês é de verdade seu.</p>
            <button type="button" className="btn" onClick={onSignUp}>Criar conta</button>
          </section>
        </div>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true"><Wallet size={17} /></span>
            <span className="brand-name">SobControle</span>
          </div>
          <span>Controle de despesas pessoais.</span>
          <button type="button" className="link-btn" style={{marginLeft: 'auto'}} onClick={onSignIn}>Entrar</button>
        </div>
      </footer>
    </div>
  );
};
