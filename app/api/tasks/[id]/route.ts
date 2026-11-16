import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };
type TaskRow = { id: number; title: string; completed: number; created_at: string };

function getId(value: string): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function serialize(task: TaskRow) {
  return { ...task, completed: Boolean(task.completed) };
}

export async function GET(_request: Request, context: Context) {
  const id = getId((await context.params).id);

  if (!id) {
    return NextResponse.json({ error: 'Invalid ID.' }, { status: 400 });
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined;

  if (!task) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  return NextResponse.json(serialize(task));
}

export async function PATCH(request: Request, context: Context) {
  const id = getId((await context.params).id);

  if (!id) {
    return NextResponse.json({ error: 'Invalid ID.' }, { status: 400 });
  }

  const current = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined;

  if (!current) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const title = input.title === undefined ? current.title : input.title;
  const completed = input.completed === undefined ? Boolean(current.completed) : input.completed;

  if (
    typeof title !== 'string' ||
    !title.trim() ||
    title.trim().length > 120 ||
    typeof completed !== 'boolean'
  ) {
    return NextResponse.json({ error: 'Invalid title or completed flag.' }, { status: 400 });
  }

  db.prepare('UPDATE tasks SET title = ?, completed = ? WHERE id = ?').run(
    title.trim(),
    completed ? 1 : 0,
    id,
  );

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow;
  return NextResponse.json(serialize(task));
}

export async function DELETE(_request: Request, context: Context) {
  const id = getId((await context.params).id);

  if (!id) {
    return NextResponse.json({ error: 'Invalid ID.' }, { status: 400 });
  }

  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);

  if (!result.changes) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
