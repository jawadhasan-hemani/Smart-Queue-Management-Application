function createFakeDb() {
  let notifications = [];
  let history = [];
  let services = [];
  let queues = [];
  let queueEntries = [];
  let notifSeq = 0;
  let histSeq = 0;
  let svcSeq = 0;
  let queueSeq = 0;
  let entrySeq = 0;

  function priorityRank(p) {
    return { high: 0, medium: 1, low: 2 }[p] ?? 3;
  }

  async function query(sql, values = []) {
    const text = sql.replace(/\s+/g, ' ').trim();

    if (text.startsWith('INSERT INTO services')) {
      const [name, description, duration, priority, open] = values;
      const now = new Date(Date.now() + svcSeq).toISOString();
      const row = {
        id: `svc-fake-${++svcSeq}`,
        name,
        description,
        duration,
        priority,
        open,
        created_at: now,
        updated_at: now,
      };
      services.push(row);
      return { rows: [row] };
    }

    if (text.startsWith('SELECT * FROM services WHERE id')) {
      const row = services.find((s) => s.id === values[0]) || null;
      return { rows: row ? [row] : [] };
    }

    if (text.startsWith('SELECT * FROM services')) {
      const list = [...services].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return { rows: list };
    }

    if (text.startsWith('UPDATE services SET')) {
      const id = values[values.length - 1];
      const setValues = values.slice(0, -1);
      const service = services.find((s) => s.id === id);
      if (!service) return { rows: [] };

      const setClauseMatch = text.match(/SET (.+) WHERE/);
      const assignments = setClauseMatch[1].split(',').map((s) => s.trim());

      let vi = 0;
      assignments.forEach((assign) => {
        const col = assign.split('=')[0].trim();
        if (assign.includes('NOW()')) {
          service.updated_at = new Date().toISOString();
        } else {
          service[col] = setValues[vi++];
        }
      });

      return { rows: [{ ...service }] };
    }

    if (text.startsWith('SELECT * FROM queues WHERE service_id')) {
      const row = queues.find((q) => q.service_id === values[0] && q.status === 'open');
      return { rows: row ? [row] : [] };
    }

    if (text.startsWith('INSERT INTO queues')) {
      const row = { id: `q${++queueSeq}`, service_id: values[0], status: 'open' };
      queues.push(row);
      return { rows: [row] };
    }

    if (text.startsWith('SELECT *, ROW_NUMBER()')) {
      const rows = queueEntries
        .filter((e) => e.queue_id === values[0] && e.status === 'waiting')
        .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.joined_at - b.joined_at)
        .map((e, idx) => ({ ...e, position: idx + 1 }));
      return { rows };
    }

    if (text.startsWith('INSERT INTO queue_entries')) {
      const row = {
        id: `e${++entrySeq}`,
        queue_id: values[0],
        user_id: values[1],
        student_name: values[2],
        priority: values[3],
        position: 0,
        status: 'waiting',
        joined_at: ++entrySeq, // simple sequence for sorting arrival
        served_at: null,
      };
      queueEntries.push(row);
      return { rows: [row] };
    }

    if (text.startsWith('SELECT * FROM queue_entries WHERE id')) {
      const row = queueEntries.find((e) => e.id === values[0]);
      return { rows: row ? [row] : [] };
    }

    if (text.startsWith('DELETE FROM queue_entries WHERE id')) {
      const idx = queueEntries.findIndex((e) => e.id === values[0]);
      if (idx === -1) return { rows: [] };
      const [removed] = queueEntries.splice(idx, 1);
      return { rows: [removed] };
    }

    if (text.startsWith('SELECT * FROM queue_entries') && text.includes('LIMIT 1')) {
      const rows = queueEntries
        .filter((e) => e.queue_id === values[0] && e.status === 'waiting')
        .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.joined_at - b.joined_at);
      return { rows: rows.length ? [rows[0]] : [] };
    }

    if (text.startsWith('UPDATE queue_entries') && text.includes("SET status = 'served'")) {
      const entry = queueEntries.find((e) => e.id === values[0]);
      if (entry) {
        entry.status = 'served';
        entry.served_at = new Date().toISOString();
      }
      return { rows: entry ? [entry] : [] };
    }

    if (text.startsWith('UPDATE queue_entries e')) {
      const waiting = queueEntries
        .filter((e) => e.queue_id === values[0] && e.status === 'waiting')
        .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.joined_at - b.joined_at);
      waiting.forEach((e, idx) => {
        e.position = idx + 1;
      });
      return { rows: [] };
    }

    if (text.startsWith('SELECT s.id AS service_id, s.name AS service_name, s.open')) {
      const rows = services.map((s) => {
        const q = queues.find((qq) => qq.service_id === s.id && qq.status === 'open');
        const count = q ? queueEntries.filter((e) => e.queue_id === q.id && e.status === 'waiting').length : 0;
        return { service_id: s.id, service_name: s.name, open: s.open, count };
      });
      return { rows };
    }

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
    services = [];
    queues = [];
    queueEntries = [];
    notifSeq = 0;
    histSeq = 0;
    svcSeq = 0;
    queueSeq = 0;
    entrySeq = 0;
  }

  return { query, reset };
}

module.exports = { createFakeDb };