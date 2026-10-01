import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { BigButton, Companion, En, GoalRing, Modal } from '../components/common';
import { COMPANIONS_BY_ID } from '../data/companions';
import { GRAMMAR_BY_ID } from '../data/grammar';
import { UpdateBanner } from '../components/UpdateBanner';
import { favouriteIslands } from '../data/interests';
import { islandAgeMessage, islandSuitsAge } from '../engine/age';
import { ISLANDS } from '../data/islands';
import { LETTERS_BY_ID } from '../data/letters';
import { SENTENCES_BY_ID } from '../data/sentences';
import { STORIES_BY_ID } from '../data/stories';
import { PHRASES_BY_ID } from '../data/talk';
import { WORDS_BY_ID } from '../data/words';
import { currentStage, isIslandUnlocked, isStageUnlocked, levelLabel, stageDone, todayXp } from '../engine/progress';
import { sfx } from '../engine/sound';
import { isDue } from '../engine/srs';
import type { Profile, Settings, Stage } from '../types';
import { Emoji } from '../components/Emoji';

function preview(stage: Stage): string[] {
  return stage.itemIds.slice(0, 6).map((id) => {
    if (WORDS_BY_ID[id]) return WORDS_BY_ID[id].emoji || '🎨';
    if (LETTERS_BY_ID[id]) return LETTERS_BY_ID[id].upper;
    if (SENTENCES_BY_ID[id]) return SENTENCES_BY_ID[id].emoji;
    if (STORIES_BY_ID[id]) return STORIES_BY_ID[id].emoji;
    if (PHRASES_BY_ID[id]) return PHRASES_BY_ID[id].emoji;
    if (GRAMMAR_BY_ID[id]) return GRAMMAR_BY_ID[id].emoji;
    return '❓';
  });
}

const GREETINGS = ['מוכנים להרפתקה?', 'בואו נלמד משהו חדש!', 'איזה כיף שחזרתם!', "Let's play!", 'היום נאסוף הרבה כוכבים!'];

export function MapScreen({
  profile,
  settings,
  onPlay,
  onPractice,
  onShop,
  onAchievements,
  onParents,
  onInterests,
  onSwitchProfile,
}: {
  profile: Profile;
  settings: Settings;
  onPlay: (stageId: string) => void;
  onPractice: () => void;
  onShop: () => void;
  onAchievements: () => void;
  onParents: () => void;
  onInterests: () => void;
  onSwitchProfile: () => void;
}) {
  const [selected, setSelected] = useState<Stage | null>(null);
  const current = currentStage(profile);
  const currentRef = useRef<HTMLButtonElement>(null);
  const greeting = useMemo(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)], []);
  const companion = COMPANIONS_BY_ID[profile.companion] ?? COMPANIONS_BY_ID.owl;

  const favourites = favouriteIslands(profile.interests);
  const lessonsPlayed = Object.values(profile.activity).reduce((n, d) => n + d.lessons, 0);
  const totalStars = Object.values(profile.stages).reduce((s, r) => s + r.stars, 0);
  const now = Date.now();
  const dueCount = Object.values(profile.items).filter((p) => isDue(p, now)).length;
  const xpToday = todayXp(profile, now);
  const level = levelLabel(profile.ability);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, []);

  return (
    <div className="screen map">
      <header className="map-header">
        <button type="button" className="avatar-btn" onClick={onSwitchProfile} title="החלפת שחקן">
          <span className="avatar">
            <Emoji char={profile.avatar} size={34} />
          </span>
          <span className="who">
            <b>{profile.name}</b>
            <small>
              {level.he} · <En>{level.cefr}</En>
            </small>
          </span>
        </button>
        <div className="stats">
          <span className="stat" title="כוכבים">
            ⭐ {totalStars}
          </span>
          <span className="stat" title="מטבעות">
            🪙 {profile.coins}
          </span>
          <span className={`stat ${profile.streak > 0 ? 'fire' : ''}`} title="ימים ברצף">
            🔥 {profile.streak}
          </span>
          <span className="stat goal" title={`יעד יומי: ${xpToday}/${settings.dailyGoal} נקודות`}>
            <GoalRing value={xpToday} goal={settings.dailyGoal} size={38} />
          </span>
        </div>
      </header>

      <div className="map-scroll">
        <UpdateBanner />
        <div className="map-greeting">
          <Companion id={profile.companion} message={`${greeting} ${xpToday >= settings.dailyGoal ? 'השלמתם את היעד היומי! 🎯' : ''}`} />
        </div>
        {!profile.interests && lessonsPlayed >= 2 && (
          <button type="button" className="interest-prompt pop-in" onClick={onInterests}>
            💖 ספרו לי מה אתם הכי אוהבים, ואתאים את המשחק בשבילכם!
          </button>
        )}
        {ISLANDS.map((island, ii) => {
          const unlocked = isIslandUnlocked(profile, island);
          const starsHere = island.stages.reduce((s, st) => s + (profile.stages[st.id]?.stars ?? 0), 0);
          const favourite = favourites.includes(island.id);
          return (
            <section
              key={island.id}
              className={`island ${unlocked ? '' : 'locked'} ${favourite ? 'favourite' : ''} ${islandSuitsAge(profile, island) ? '' : 'too-young'}`}
              style={{ '--island-a': island.colors[0], '--island-b': island.colors[1] } as CSSProperties}
            >
              <div className="island-banner">
                <span className="island-emoji">
                  <Emoji char={island.emoji} size={44} />
                </span>
                <div>
                  <h2>
                    {island.name} {favourite && <span title="אחד הנושאים שאתם הכי אוהבים">💖</span>}
                  </h2>
                  <En className="island-en">{island.nameEn}</En>
                </div>
                <span className="island-stars">
                  {unlocked ? `⭐ ${starsHere}/${island.stages.length * 3}` : '🔒'}
                </span>
              </div>
              {!unlocked && !islandSuitsAge(profile, island) && (
                <p className="island-lock-msg">{islandAgeMessage(island)}</p>
              )}
              {!unlocked && islandSuitsAge(profile, island) && (
                <p className="island-lock-msg">
                  {favourite ? '💖 נושא שאתם אוהבים! ייפתח מוקדם כשתתחזקו עוד קצת, או אחרי ' : 'נפתח אחרי ניצחון על הבוס של '}
                  {ISLANDS[ii - 1]?.name}
                </p>
              )}
              {/* An island the child is too young for shows only its title and when it opens. */}
              {islandSuitsAge(profile, island) && (
              <div className="path">
                {island.stages.map((stage, si) => {
                  const open = isStageUnlocked(profile, stage);
                  const done = stageDone(profile, stage);
                  const isCurrent = current?.id === stage.id;
                  const stars = profile.stages[stage.id]?.stars ?? 0;
                  const earlyBoss = stage.boss && open && !done && !stageDone(profile, island.stages[si - 1]);
                  const offset = Math.sin(si * 1.15 + ii) * 34;
                  return (
                    <div key={stage.id} className="node-wrap" style={{ transform: `translateX(${offset}%)` }}>
                      {isCurrent && (
                        <span className="node-companion">
                          <Emoji char={companion.emoji} size={40} />
                        </span>
                      )}
                      <button
                        ref={isCurrent ? currentRef : undefined}
                        type="button"
                        className={`node ${stage.boss ? 'boss' : ''} ${open ? 'open' : 'closed'} ${done ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
                        onClick={() => {
                          if (!open) return;
                          sfx.tap();
                          setSelected(stage);
                        }}
                        aria-label={stage.boss ? 'אתגר הבוס' : `שלב ${si + 1}`}
                      >
                        {!open ? '🔒' : stage.boss ? '👑' : done ? '✓' : si + 1}
                        {earlyBoss && <span className="rocket" title="קפיצה לבוס">🚀</span>}
                      </button>
                      {open && (
                        <span className="node-stars">
                          {[1, 2, 3].map((n) => (
                            <i key={n} className={n <= stars ? 'on' : ''}>
                              ★
                            </i>
                          ))}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              )}
            </section>
          );
        })}
        <div className="map-end">🏁 עוד איים בדרך...</div>
      </div>

      <nav className="bottom-nav">
        <button type="button" onClick={onPractice}>
          <span>🔁</span>
          <small>תרגול</small>
          {dueCount > 0 && <i className="badge">{dueCount > 99 ? '99+' : dueCount}</i>}
        </button>
        <button type="button" onClick={onShop}>
          <span>🛍️</span>
          <small>חנות</small>
        </button>
        <button type="button" onClick={onAchievements}>
          <span>🏆</span>
          <small>הישגים</small>
        </button>
        <button type="button" onClick={onInterests}>
          <span>💖</span>
          <small>אני אוהב</small>
        </button>
        <button type="button" onClick={onParents}>
          <span>👨‍👩‍👧</span>
          <small>הורים</small>
        </button>
      </nav>

      {selected && (
        <StageSheet
          stage={selected}
          profile={profile}
          onClose={() => setSelected(null)}
          onPlay={() => {
            setSelected(null);
            onPlay(selected.id);
          }}
        />
      )}
    </div>
  );
}

function StageSheet({ stage, profile, onClose, onPlay }: { stage: Stage; profile: Profile; onClose: () => void; onPlay: () => void }) {
  const island = ISLANDS.find((i) => i.id === stage.islandId)!;
  const res = profile.stages[stage.id];
  const earlyBoss = stage.boss && !stageDone(profile, island.stages[stage.index - 1]);
  return (
    <Modal onClose={onClose}>
      <div className="sheet" style={{ '--island-a': island.colors[0], '--island-b': island.colors[1] } as CSSProperties}>
        <div className="sheet-head">
          <span className="sheet-emoji">
            <Emoji char={stage.boss ? '👑' : island.emoji} size={60} />
          </span>
          <h2>{stage.boss ? 'אתגר הבוס!' : `שלב ${stage.index + 1}`}</h2>
          <span>{island.name}</span>
        </div>
        {stage.boss ? (
          <p>{earlyBoss ? '🚀 אתם כל כך טובים שאפשר לקפוץ ישר לבוס! ניצחון יפתח את האי הבא.' : 'חזרה על כל מה שלמדנו באי. נצחו כדי לפתוח את האי הבא!'}</p>
        ) : (
          <div className="sheet-preview">
            {preview(stage).map((e, i) => (
              <span key={i}>{e}</span>
            ))}
          </div>
        )}
        {res && res.stars > 0 && (
          <p className="sheet-best">
            הכי טוב: {'★'.repeat(res.stars)}
            {'☆'.repeat(3 - res.stars)} · {Math.round(res.bestAccuracy * 100)}%
          </p>
        )}
        <BigButton onClick={onPlay} className="pulse">
          {res && res.stars > 0 ? 'לשחק שוב 🔄' : 'יאללה! ▶'}
        </BigButton>
      </div>
    </Modal>
  );
}
