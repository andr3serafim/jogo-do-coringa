// A fita de cordel (sub-projeto 6 §4): a faixa das batidas desce do placar, em papel com as pontas recortadas e a borda de tinta,
// com o título em tipo de madeira e, se houver, o motivo em letra menor ("causou mais dano na rodada · 50 × 37"). É o padrão de
// todas as faixas da mesa ("Sua vez", "Rodada 8 · Ataque", o Roubo, a quadra). As regras da faixa de antes valem (spec da web
// §10.4): a camada fica montada o tempo todo e só esmaece; quem decide quando ela sobe e desce é o `useBeatPlayer` (o `ribbon` do
// contexto da animação), e entre uma faixa e a seguinte só o texto troca. A área é pequena (bem menos que 25% da tela). Escondida
// do leitor de tela: o histórico é o registro acessível. Com movimento reduzido, só esmaece, sem descer nem abrir.
import type { Ribbon } from '../../model/copy.ts';
import { ribbonText } from '../../model/effects.ts';

/** As pontas recortadas da fita (em cauda de andorinha), na borda de tinta e no papel. */
const NOTCHED = 'polygon(0 0, 100% 0, 95% 50%, 100% 100%, 0 100%, 5% 50%)';

export function RibbonLayer({ ribbon, reduced }: { ribbon: Ribbon | null; reduced: boolean }) {
  const shown = ribbon !== null;
  const motion = reduced ? '' : shown ? 'translate-y-0 scale-x-100' : '-translate-y-4 scale-x-[0.6]';
  return (
    <div
      aria-hidden="true"
      data-camada-faixa
      data-fita
      data-faixa={ribbon === null ? undefined : ribbonText(ribbon)}
      className={`pointer-events-none absolute left-1/2 top-full z-30 mt-1.5 w-max max-w-[calc(100vw-1.5rem)] -translate-x-1/2 transition-[opacity,translate,scale] duration-[220ms] ease-out pc:mt-2.5 pc:max-w-[min(42rem,90%)] ${shown ? 'opacity-100' : 'opacity-0'} ${motion}`}
    >
      {ribbon === null ? null : (
        <div className="bg-tinta p-[3px] drop-shadow-[2px_3px_0_rgb(0_0_0/0.35)]" style={{ clipPath: NOTCHED }}>
          <div className="bg-papel px-7 pb-1 pt-1.5 text-center text-tinta pc:px-12 pc:pb-1.5 pc:pt-2" style={{ clipPath: NOTCHED }}>
            <p className="font-madeira text-[15px] uppercase leading-tight tracking-[0.03em] pc:text-[21px]">{ribbon.title}</p>
            {ribbon.reason === null ? null : (
              <p className="font-texto text-[10.5px] font-bold leading-tight tabular-nums text-tinta/75 pc:text-[12.5px]">
                {ribbon.reason}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
