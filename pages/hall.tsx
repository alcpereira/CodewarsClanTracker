import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ChangeText from '../components/ChangeText';
import Header from '../components/Header';
import LoadingIndicator from '../components/LoadingIndicator';
import { dateToYYYYMMDD, getWeekNumber } from '../shared';

interface HonorUser {
  username: string;
  honor: number;
  honorChange: number;
}

const copyAndMutate = (date: Date, mutate: (date: Date) => void) => {
  const newDate = new Date(date);
  mutate(newDate);
  return newDate;
};

interface FameData {
  type: TrackingPeriod;
  start: Date;
  end?: Date;
  board: { honor: HonorUser[]; change: HonorUser[] };
}

interface FameProps extends FameData {
  boardPreference: keyof FameData['board'];
}

function Fame({ type, start, end, board, boardPreference: showingBoard }: FameProps) {
  //const [showingBoard, setShowingBoard] = useState<keyof FameData['board']>(boardPreference);

  const startStr =
    type === 'days'
      ? dateToYYYYMMDD(start)
      : type === 'weeks'
      ? dateToYYYYMMDD(start)
      : dateToYYYYMMDD(start);
  const endStr = end
    ? type === 'days'
      ? dateToYYYYMMDD(end!)
      : type === 'weeks'
      ? dateToYYYYMMDD(end!)
      : dateToYYYYMMDD(end!)
    : 'now';
  const msg =
    showingBoard === 'honor'
      ? `the most honor, with ${board[showingBoard][0].honor}`
      : `gained the most honor, gaining ${board[showingBoard][0].honorChange}`;

  const prettyType = useMemo(() => type[0].toUpperCase() + type.slice(1), [type]);

  return (
    <li className="fame" data-type={type}>
      <span className="tag" aria-label={prettyType} title={prettyType}>
        {type[0].toUpperCase()}
      </span>
      <h3>
        <Link href={`/leaderboard?start=${dateToYYYYMMDD(start)}&end=${dateToYYYYMMDD(end || new Date())}&sortBy=${showingBoard}`}>
          <a>
            {startStr} -&gt; {endStr}
          </a>
        </Link>
      </h3>
      {/*end ? (
        <span>
          From {startStr} to {endStr}, {board[showingBoard][0].username} had {msg}
        </span>
      ) : (
        <span>
          From {startStr} to now, {board[showingBoard][0].username} has {msg}
        </span>
      )*/}
      <hr />
      <table>
        <thead>
          <tr>
            {showingBoard === 'honor' ? (
              <>
                <th>Position</th>
                <th>Username</th>
              </>
            ) : (
              <>
                <th>Username</th>
                <th>Gained Honor</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {board[showingBoard].slice(0, 3).map((u, i) => {
            const color = type === 'days' ? 'bronze' : type === 'weeks' ? 'silver' : 'gold';
            const userCell = i ? (
              <td>{u.username}</td>
            ) : (
              <td>
                <img alt="" src={`/${color}-diamond.webp`} className="achievement" />
                {u.username}
                <img alt="" src={`/${color}-diamond.webp`} className="achievement" />
              </td>
            );
            return (
              <tr key={i}>
                {showingBoard === 'honor' ? (
                  <>
                    <td>#{i + 1}</td>
                    {userCell}
                  </>
                ) : (
                  <>
                    {userCell}
                    <td>
                      <ChangeText amount={u.honorChange} />
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </li>
  );
}

type TrackingPeriod = 'days' | 'weeks' | 'months';

export default function Hall() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Record<TrackingPeriod, Record<number, { honor: HonorUser[]; change: HonorUser[] }>>>(
    {
      days: {},
      weeks: {},
      months: {},
    },
  );
  useEffect(() => {
    setLoading(true);
    fetch('/api/hall')
      .then(response => response.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const [boardPreference, setBoardPreference] = useState<keyof FameData['board']>('change');

  const [showing, setShowing] = useState<Record<TrackingPeriod, boolean>>({ days: true, weeks: true, months: true });

  const { activeFames, inactiveFames } = useMemo(() => {
    if (loading) return { activeFames: [], inactiveFames: [] };

    const inactiveFames: FameData[] = [];
    const activeFames: FameData[] = [];

    let last = '';
    for (const key in data.days) {
      inactiveFames.push({
        type: 'days',
        start: new Date(+key),
        end: copyAndMutate(new Date(+key), date => date.setUTCDate(date.getUTCDate() + 1)),
        board: data.days[+key],
      });
      last = key;
    }
    inactiveFames.pop();
    activeFames.push({ type: 'days', start: new Date(+last), board: data.days[+last] });

    last = '';
    for (const key in data.weeks) {
      inactiveFames.push({
        type: 'weeks',
        start: new Date(+key),
        end: copyAndMutate(new Date(+key), date => date.setUTCDate(date.getUTCDate() + 6)),
        board: data.weeks[+key],
      });
      last = key;
    }
    inactiveFames.pop();
    activeFames.push({
      type: 'weeks',
      start: new Date(+last),
      board: data.weeks[+last],
    });

    last = '';
    for (const key in data.months) {
      inactiveFames.push({
        type: 'months',
        start: new Date(+key),
        end: copyAndMutate(new Date(+key), date => date.setUTCMonth(date.getUTCMonth() + 1)),
        board: data.months[+key],
      });
      last = key;
    }
    inactiveFames.pop();
    activeFames.push({
      type: 'months',
      start: new Date(+last),
      board: data.months[+last],
    });

    const now = Date.now();

    const filterAndSort = (fames: FameData[]) =>
      fames
        .filter(f => f.board.change.length && f.board.honor.length)
        .sort((a, b) => {
          const aEnd = a.end?.getTime() || now;
          const bEnd = b.end?.getTime() || now;
          const diff = bEnd - aEnd;
          if (diff) return diff;
          return b.start.getTime() - b.start.getTime();
        });

    return { activeFames: filterAndSort(activeFames), inactiveFames: filterAndSort(inactiveFames) };
  }, [data, loading]);

  return (
    <>
      <Head>
        <title>#100Devs Codewars Hall of Fame</title>
      </Head>

      <Header />
      <main style={{ textAlign: 'center' }}>
        <h1>Hall of Fame</h1>
        <p>
          Here is listed all those that achieved greatness, being in the top ten for some time period wither as wth the
          most honor, or gaining the most honor!
        </p>
        <LoadingIndicator loading={loading} />
        <fieldset style={{ width: 'max-content', display: 'flex', flexDirection: 'column', float: 'left' }}>
          <legend>Periods</legend>
          <label>
            Days{' '}
            <input
              type="checkbox"
              checked={showing.days}
              onChange={e => setShowing({ ...showing, days: e.currentTarget.checked })}
            />
          </label>

          <label>
            Weeks{' '}
            <input
              type="checkbox"
              checked={showing.weeks}
              onChange={e => setShowing({ ...showing, weeks: e.currentTarget.checked })}
            />
          </label>

          <label>
            Months{' '}
            <input
              type="checkbox"
              checked={showing.months}
              onChange={e => setShowing({ ...showing, months: e.currentTarget.checked })}
            />
          </label>
        </fieldset>

        <fieldset style={{ width: 'max-content', display: 'flex', flexDirection: 'column', float: 'right' }}>
          <legend>Sorting</legend>
          <label>
            Highest Honor{' '}
            <input
              type="radio"
              name="sorting"
              value="honor"
              checked={boardPreference === 'honor'}
              onChange={e => setBoardPreference(e.currentTarget.checked ? 'honor' : 'change')}
            />
          </label>
          <label>
            Gained Honor{' '}
            <input
              type="radio"
              name="sorting"
              value="change"
              checked={boardPreference === 'change'}
              onChange={e => setBoardPreference(e.currentTarget.checked ? 'change' : 'honor')}
            />
          </label>
        </fieldset>

        <div style={{ clear: 'both' }}>
          <h2>Active</h2>

          <ul>
            {activeFames
              .filter(fame => showing[fame.type])
              .map(fame => (
                <Fame key={fame.type + fame.start.getTime()} {...fame} boardPreference={boardPreference} />
              ))}
          </ul>
          <h2>Finished</h2>

          <ul>
            {inactiveFames
              .filter(fame => showing[fame.type])
              .map(fame => (
                <Fame key={fame.type + fame.start.getTime()} {...fame} boardPreference={boardPreference} />
              ))}
          </ul>
        </div>
      </main>
    </>
  );
}
