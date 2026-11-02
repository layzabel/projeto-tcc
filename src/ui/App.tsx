'use client';

// Aplicação de página única: a tela é sempre derivada do estado (R1, contracts/screens.md).
// A área dos adultos substitui a tela infantil enquanto aberta; ao fechar, a tela é derivada de
// novo e um encerramento em andamento recomeça do início (FR-028, FR-033).

import { useMemo, type ReactNode } from 'react';
import { addUsed, shouldCount } from '../domain/counting';
import { exhausted } from '../domain/day';
import { isComplete, type CompleteDocument } from '../domain/model';
import {
  deriveScreen,
  LOADING,
  type BaseScreen,
  type ChildScreen,
  type DocSnapshot,
} from '../domain/screen';
import { systemClock, type Clock } from '../platform/clock';
import { AdultArea } from './adult/AdultArea';
import { Log } from './adult/panel/Log';
import { Settings } from './adult/panel/Settings';
import { Today } from './adult/panel/Today';
import { Setup } from './adult/Setup';
import { Blocked } from './child/Blocked';
import { Closure } from './child/Closure';
import { Game } from './child/Game';
import { Story } from './child/Story';
import { World } from './child/World';
import { browserServices, ServicesProvider, type Services } from './state/services';
import { isOverlayOpen, useSession, type PanelTab } from './state/session';
import { getBrowserStore, useAppState, type AppStore } from './state/store';
import { useAlmostDoneWarning } from './state/useAlmostDoneWarning';
import { useDayRollover } from './state/useDayRollover';
import { useMotionPreference } from './state/useMotionPreference';
import { useTimeCounter } from './state/useTimeCounter';
import { useVisibility } from './state/useVisibility';

type Props = { store?: AppStore; clock?: Clock; services?: Services };

/** Documento com os segundos contados e ainda não gravados, para a tela refletir o tempo em ≤ 1 s. */
function withPending(doc: DocSnapshot, pending: number): DocSnapshot {
  return isComplete(doc) && pending > 0
    ? { ...doc, currentDay: addUsed(doc.currentDay, pending) }
    : doc;
}

export function App({ store, clock = systemClock, services = browserServices }: Props) {
  const appStore = useMemo(() => store ?? getBrowserStore(clock), [store, clock]);
  const saved = useAppState(appStore);
  const { session, setChildScreen, setOverlay, closeOverlay, reset } = useSession();
  const visible = useVisibility();

  // Dados apagados (aqui ou em outra aba): a sessão volta ao início, sem área do adulto aberta.
  const sessionDirty = isOverlayOpen(session.adultOverlay) || session.childScreen !== 'mundo';
  if (saved !== LOADING && !isComplete(saved) && sessionDirty) {
    reset();
  }

  const active = shouldCount({
    screen: deriveScreen(saved, session),
    visible,
    exhausted: isComplete(saved) && exhausted(saved.currentDay),
    overlayOpen: isOverlayOpen(session.adultOverlay),
  });
  const pending = useTimeCounter({ active, store: appStore, clock });
  useDayRollover(appStore);

  const doc = withPending(saved, pending);
  const screen: BaseScreen = deriveScreen(doc, session);
  useMotionPreference(isComplete(doc) && doc.settings.reducedMotion);

  const view = (): ReactNode => {
    if (screen === 'carregando') {
      return <main data-tela="carregando" aria-busy="true" className="tela-adulto" />;
    }
    if (screen === 'configuracao' || !isComplete(doc)) {
      return <Setup store={appStore} clock={clock} />;
    }
    if (session.adultOverlay !== 'fechado') {
      return (
        <AdultArea
          overlay={session.adultOverlay}
          doc={doc}
          store={appStore}
          onOverlay={setOverlay}
          onClose={closeOverlay}
          renderTab={(tab) => (
            <PanelTabContent
              tab={tab}
              doc={doc}
              store={appStore}
              onClose={closeOverlay}
              onCleared={reset}
            />
          )}
        />
      );
    }
    return (
      <ChildScreens
        screen={screen}
        doc={doc}
        store={appStore}
        closureRun={session.closureRun}
        onOpen={setChildScreen}
        onAdult={() => setOverlay('senha')}
      />
    );
  };

  return <ServicesProvider value={services}>{view()}</ServicesProvider>;
}

type TabProps = {
  tab: PanelTab;
  doc: CompleteDocument;
  store: AppStore;
  onClose: () => void;
  onCleared: () => void;
};

function PanelTabContent({ tab, doc, store, onClose, onCleared }: TabProps) {
  if (tab === 'hoje') {
    return <Today doc={doc} store={store} onClose={onClose} />;
  }
  if (tab === 'ajustes') {
    return <Settings doc={doc} store={store} onCleared={onCleared} />;
  }
  return <Log doc={doc} />;
}

/** História aberta pelo mundo da criança: conta tempo e pode tocar o aviso (FR-011, FR-025). */
function StoryScreen({
  doc,
  store,
  onFinish,
}: {
  doc: CompleteDocument;
  store: AppStore;
  onFinish: () => void;
}) {
  useAlmostDoneWarning(doc, store);
  return <Story settings={doc.settings} onFinish={onFinish} standalone />;
}

type ChildProps = {
  screen: BaseScreen;
  doc: CompleteDocument;
  store: AppStore;
  closureRun: number;
  onOpen: (screen: ChildScreen) => void;
  onAdult: () => void;
};

function ChildScreens({ screen, doc, store, closureRun, onOpen, onAdult }: ChildProps) {
  if (screen === 'encerramento') {
    return <Closure key={closureRun} doc={doc} store={store} onAdult={onAdult} />;
  }
  if (screen === 'bloqueio') {
    return <Blocked doc={doc} onAdult={onAdult} />;
  }
  if (screen === 'jogo') {
    return <Game doc={doc} store={store} onFinish={() => onOpen('mundo')} />;
  }
  if (screen === 'historia') {
    return <StoryScreen doc={doc} store={store} onFinish={() => onOpen('mundo')} />;
  }
  return <World doc={doc} store={store} onOpen={onOpen} onAdult={onAdult} />;
}
