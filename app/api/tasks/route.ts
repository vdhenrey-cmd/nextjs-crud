import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TaskRow = { id: number; title: string; completed: number; created_at: string };

export async function GET() {
  const tasks = db
    .prepare('SELECT * FROM tasks ORDER BY id DESC')
    .all() as TaskRow[];

  return NextResponse.json(
    tasks.map((task) => ({
      ...task,
      completed: Boolean(task.completed),
    })),
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== 'object' ||
    !('title' in body) ||
    typeof body.title !== 'string' ||
    !body.title.trim() ||
    body.title.trim().length > 120
  ) {
    return NextResponse.json({ error: 'Title must be 1–120 characters.' }, { status: 400 });
  }

  const title = body.title.trim();
  const result = db.prepare('INSERT INTO tasks (title) VALUES (?)').run(title);
  const task = db
    .prepare('SELECT * FROM tasks WHERE id = ?')
    .get(result.lastInsertRowid) as TaskRow;

  return NextResponse.json({ ...task, completed: Boolean(task.completed) }, { status: 201 });
}
