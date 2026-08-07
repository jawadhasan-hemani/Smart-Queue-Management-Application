function createFakeDb() {
  let notifications = [];
  let history = [];
  let notifSeq = 0;
  let histSeq = 0;

  async function query(sql, values = []) {
    const text = sql.replace(/\s+/g, ' ').trim();

    if (text.startsWith('INSERT INTO notifications')) {
      const [userId, studentName, serviceId, serviceName, type, message] = values;
      const row = {
        id: `n${++notifSeq}`,
        user_id: userId,
        student_name: studentName,
        service_id: serviceId,
        service_name: serviceName,
        type,
        message,
        status: 'sent',
        created_at: new Date(Date.now() + notifSeq).toISOString(),
      };
      notifications.push(row);
      return { rows: [row] };
    }

    if (text.startsWith('SELECT * FROM notifications WHERE id')) {
      const row = notifications.find((n) => n.id === values[0]) || null;
      return { rows: row ? [row] : [] };
    }

    if (text.startsWith('UPDATE notifications SET status')) {
      const row = notifications.find((n) => n.id === values[0]);
      if (row) row.status = 'viewed';
      return { rows: row ? [row] : [] };
    }

    if (text.startsWith('SELECT * FROM notifications')) {
      let list = [...notifications];
      let vi = 0;
      if (text.includes('LOWER(student_name) = LOWER(')) {
        const name = values[vi++];
        list = list.filter((n) => n.student_name.toLowerCase() === name.toLowerCase());
      }
      if (text.includes('message ILIKE')) {
        const needle = values[vi++].replace(/%/g, '').toLowerCase();
        list = list.filter(
          (n) => n.message.toLowerCase().includes(needle) || n.service_name.toLowerCase().includes(needle),
        );
      }
      if (text.includes('type = $')) {
        const type = values[vi++];
        list = list.filter((n) => n.type === type);
      }
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return { rows: list };
    }

    if (text.startsWith('INSERT INTO queue_history')) {
      const [userId, studentName, serviceId, serviceName, priority, status, joinedAt, endedAt, waitedMinutes] = values;
      const row = {
        id: `h${++histSeq}`,
        user_id: userId,
        student_name: studentName,
        service_id: serviceId,
        service_name: serviceName,
        priority,
        status,
        joined_at: joinedAt,
        ended_at: endedAt,
        waited_minutes: waitedMinutes,
      };
      history.push(row);
      return { rows: [row] };
    }

    if (text.startsWith('SELECT * FROM queue_history WHERE id')) {
      const row = history.find((h) => h.id === values[0]) || null;
      return { rows: row ? [row] : [] };
    }

    if (text.startsWith('SELECT COALESCE(ROUND(AVG(waited_minutes')) {
      let list = history.filter((h) => h.waited_minutes > 0);
      if (text.includes('LOWER(student_name) = LOWER(')) {
        const name = values[0];
        list = list.filter((h) => h.student_name.toLowerCase() === name.toLowerCase());
      }
      const avg = list.length
        ? Math.round(list.reduce((sum, h) => sum + h.waited_minutes, 0) / list.length)
        : 0;
      return { rows: [{ avg_wait: avg }] };
    }

    if (text.startsWith('SELECT * FROM queue_history')) {
      let list = [...history];
      let vi = 0;
      if (text.includes('LOWER(student_name) = LOWER(')) {
        const name = values[vi++];
        list = list.filter((h) => h.student_name.toLowerCase() === name.toLowerCase());
      }
      if (text.includes('service_name ILIKE')) {
        const needle = values[vi++].replace(/%/g, '').toLowerCase();
        list = list.filter((h) => h.service_name.toLowerCase().includes(needle));
      }
      if (text.includes('ORDER BY ended_at ASC')) {
        list.sort((a, b) => new Date(a.ended_at) - new Date(b.ended_at));
      } else if (text.includes('ORDER BY waited_minutes DESC')) {
        list.sort((a, b) => b.waited_minutes - a.waited_minutes);
      } else {
        list.sort((a, b) => new Date(b.ended_at) - new Date(a.ended_at));
      }
      return { rows: list };
    }

    throw new Error(`fakeDb: unhandled query: ${text}`);
  }

  function reset() {
    notifications = [];
    history = [];
    notifSeq = 0;
    histSeq = 0;
  }

  return { query, reset };
}

module.exports = { createFakeDb };
