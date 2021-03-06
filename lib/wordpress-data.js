import Rx from "@reactivex/rxjs";
import R from "ramda";
import moment from "moment";
import {MySQLQueryObservable} from "./database";

const WordpressRowsReduceObservable = (rows) =>
  Rx.Observable
    .from(
      rows
        .map(row => {
          const matched = row.meta_key.match(/services_([0-9]+)_(.*)/);
          if (matched === null) {
            return null;
          } else {
            const data = {};
            data[matched[2]] = row.meta_value;
            return { id: matched[1], data: data };
          }
        })
        .filter(row => row !== null)
        .reduce((prev, curr) => {
          const item = prev[curr.id] || {};
          prev[curr.id] = Object.assign({}, item, curr.data);
          return prev;
        }, [])
    )
    .map(record =>
      Object.assign(
        {},
        record,
        {
          date: moment(record.date, "YYYYMMDD").format("YYYY-MM-DD"),
          week: moment(record.date, "YYYYMMDD").add(1, "day").week(),
          // +1 days to ensure sat and sun week number are the same
          // week number should relate to sunday
        }
      )
    );


export const ListBooklet = (conn) => () =>
  MySQLQueryObservable(conn)
    (`
      SELECT meta_key, meta_value
      FROM wp_postmeta
      WHERE post_id = 212
        AND (
          meta_key LIKE 'services_%_date'
          OR meta_key LIKE 'services_%_session'
          OR meta_key LIKE 'services_%_content'
          OR meta_key LIKE 'services_%_booklet'
        );
    `)
    .map(result => WordpressRowsReduceObservable(result.rows))
    .mergeAll()
    .toArray()
    .map(booklets => // one week one booklet
      Rx.Observable.from(
        R.values(R.groupBy(booklet => booklet.week)(booklets))
          .map(groupData => groupData.sort((a, b) => a.date < b.date)[0])
          .map(({date, week, booklet}) => ({date, week, booklet}))
          .sort((a, b) => a.date < b.date)
      )
    )
    .mergeAll();

export const ListAudio = (conn) => () =>
  MySQLQueryObservable(conn)
    (`
      SELECT meta_key, meta_value
      FROM wp_postmeta
      WHERE post_id = 212
        AND (
          meta_key LIKE 'services_%_date'
          OR meta_key LIKE 'services_%_session'
          OR meta_key LIKE 'services_%_content'
          OR meta_key LIKE 'services_%_audio'
        );
    `)
    .map(result => WordpressRowsReduceObservable(result.rows))
    .mergeAll();
