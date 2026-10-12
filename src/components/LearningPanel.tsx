import { useState } from 'react';
import { learningReport, STATUS_LABELS, wordProgressList, type WordStatus } from '../engine/learning';
import { speak } from '../engine/speech';
import type { Profile } from '../types';
import { En } from './common';
import { Emoji } from './Emoji';

const STATUSES: WordStatus[] = ['learning', 'remembered', 'mastered'];
type Filter = WordStatus | 'all' | 'struggling';

/** Parent view of the child's word learning: the steps every word goes through, weekly progress and what needs help. */
export function LearningPanel({ profile }: { profile: Profile }) {
  const [filter, setFilter] = useState<Filter>('all');
  const report = learningReport(profile);
  const words = wordProgressList(profile);
  const shown = words.filter((w) => (filter === 'all' ? true : filter === 'struggling' ? w.struggling : w.status === filter));
  const maxWeek = Math.max(4, ...report.weeks.map((w) => Math.max(w.met, w.remembered)));
  const delta = report.thisWeek.remembered - report.lastWeek.remembered;

  return (
    <>
      <section className="card learning">
        <h3>📈 מעקב למידת מילים</h3>
        <p className="muted">
          כל מילה עוברת שלושה שלבים. מילה נחשבת <b>נלמדה</b> רק כשהילד עונה עליה נכון גם <b>ביום אחר</b> – כך יודעים שהוא באמת זוכר, ולא רק
          ניחש באותו שיעור.
        </p>
        <div className="status-ladder">
          {STATUSES.map((s) => (
            <div key={s} className={`status-step ${s}`}>
              <span className="status-emoji">{STATUS_LABELS[s].emoji}</span>
              <b>{report.counts[s]}</b>
              <span className="status-name">{STATUS_LABELS[s].he}</span>
              <small>{STATUS_LABELS[s].desc}</small>
            </div>
          ))}
        </div>
        {report.total > 0 && (
          <div className="status-bar" aria-hidden>
            {STATUSES.map((s) => (
              <span key={s} className={s} style={{ flex: report.counts[s] }} />
            ))}
          </div>
        )}

        <div className="week-compare">
          <div>
            <b>{report.thisWeek.met}</b>
            <small>מילים חדשות השבוע</small>
          </div>
          <div>
            <b>{report.thisWeek.remembered}</b>
            <small>
              נלמדו השבוע
              {report.lastWeek.remembered > 0 && <em className={delta >= 0 ? 'up' : 'down'}>{delta >= 0 ? ` ▲${delta}` : ` ▼${-delta}`}</em>}
            </small>
          </div>
          <div>
            <b>{report.due}</b>
            <small>מחכות לחזרה</small>
          </div>
        </div>

        <div className="week-chart" role="img" aria-label="מילים חדשות ומילים שנלמדו בכל שבוע">
          {report.weeks.map((w) => (
            <div key={w.start} className="week-col" title={`שבוע ${w.label}: ${w.met} חדשות, ${w.remembered} נלמדו`}>
              <div className="week-bars">
                <span className="met" style={{ height: `${(w.met / maxWeek) * 100}%` }}>
                  {w.met > 0 && <i>{w.met}</i>}
                </span>
                <span className="rem" style={{ height: `${(w.remembered / maxWeek) * 100}%` }}>
                  {w.remembered > 0 && <i>{w.remembered}</i>}
                </span>
              </div>
              <small>{w.label}</small>
            </div>
          ))}
        </div>
        <div className="chart-legend">
          <span className="met">מילים חדשות</span>
          <span className="rem">נלמדו (נזכרו ביום אחר)</span>
        </div>

        {report.insights.length > 0 && (
          <ul className="insights">
            {report.insights.map((i, n) => (
              <li key={n} className={i.tone}>
                {i.text}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h3>📚 כל המילים ({words.length})</h3>
        <div className="word-filters">
          {(['all', ...STATUSES, 'struggling'] as Filter[]).map((f) => (
            <button key={f} type="button" className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
              {f === 'all'
                ? `הכול (${words.length})`
                : f === 'struggling'
                  ? `⚠️ צריך חיזוק (${report.struggling.length})`
                  : `${STATUS_LABELS[f].emoji} ${STATUS_LABELS[f].he} (${report.counts[f]})`}
            </button>
          ))}
        </div>
        {shown.length ? (
          <div className="word-table">
            {shown.map((w) => (
              <button key={w.word.en} type="button" className={`word-row ${w.status} ${w.struggling ? 'struggling' : ''}`} onClick={() => void speak(w.word.en)}>
                {w.word.emoji ? <Emoji char={w.word.emoji} size={30} /> : <span className="swatch" style={{ background: w.word.swatch }} />}
                <En className="wr-en">{w.word.en}</En>
                <span className="wr-he">{w.word.he}</span>
                <span className="wr-status">{w.struggling ? '⚠️' : STATUS_LABELS[w.status].emoji}</span>
                <small className="wr-acc">
                  {w.progress.correct}✓ {w.progress.wrong}✗
                </small>
              </button>
            ))}
          </div>
        ) : (
          <p className="muted">אין כאן מילים כרגע.</p>
        )}
        <p className="muted">לחיצה על מילה משמיעה אותה. מילים שצריכות חיזוק חוזרות אוטומטית בתרגול ובמשימה היומית.</p>
      </section>
    </>
  );
}
