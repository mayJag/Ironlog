import React, { useState } from 'react';
import { Plus, Trash2, Dumbbell, Search } from 'lucide-react';
import { saveCustomExercise, deleteCustomExercise } from '../store/db';
import {
  useExerciseLibrary, BASE_EXERCISES, EX_CATEGORIES, EX_MUSCLES, EX_EQUIPMENT,
} from '../data/exercises';
import { useToast } from '../components/Toast';
import styles from './Exercises.module.css';

export default function Exercises() {
  const { exercises, customExercises, reload } = useExerciseLibrary();
  const { toast, confirm } = useToast();
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ name: '', muscleGroup: 'chest', category: 'compound', equipment: 'barbell' });

  const handleAdd = async () => {
    const name = form.name.trim();
    if (!name) { toast('Enter an exercise name.', 'warning'); return; }
    if (exercises.some(e => e.name.toLowerCase() === name.toLowerCase())) {
      toast('That exercise already exists.', 'warning'); return;
    }
    await saveCustomExercise({ name, muscleGroup: form.muscleGroup, category: form.category, equipment: form.equipment });
    setForm({ ...form, name: '' });
    await reload();
    toast(`Added "${name}".`, 'success');
  };

  const handleDelete = async (name) => {
    const ok = await confirm({ title: 'Delete exercise?', message: `Remove "${name}" from your library?`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    await deleteCustomExercise(name);
    await reload();
  };

  const filtered = exercises.filter(e => e.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="page stagger">
      <header>
        <h1 className="page-title">Exercise Library</h1>
        <p className="page-subtitle">{BASE_EXERCISES.length} built-in · {customExercises.length} custom</p>
      </header>

      <section className="section card">
        <h2 className={styles.title}><Plus size={15} /> Add custom exercise</h2>
        <input className="input" placeholder="Exercise name" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ marginBottom: 'var(--sp-3)' }} />
        <div className={styles.selectRow}>
          <select className="select" value={form.muscleGroup} onChange={(e) => setForm({ ...form, muscleGroup: e.target.value })}>
            {EX_MUSCLES.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
          </select>
          <select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {EX_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="select" value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })}>
            {EX_EQUIPMENT.map(eq => <option key={eq} value={eq}>{eq}</option>)}
          </select>
        </div>
        <button className="btn btn--primary btn--full" onClick={handleAdd}><Plus size={16} /> Add to Library</button>
      </section>

      <section className="section">
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input className="input" style={{ paddingLeft: 36 }} placeholder="Search library…"
            value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className={styles.list}>
          {filtered.map(ex => (
            <div key={ex.name} className={`${styles.item} card`}>
              <Dumbbell size={16} className={styles.itemIcon} />
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>{ex.name} {ex.custom && <span className="badge badge--accent">custom</span>}</span>
                <span className={styles.itemSub}>{ex.muscleGroup} · {ex.category} · {ex.equipment}</span>
              </div>
              {ex.custom && (
                <button className="btn btn--ghost btn--icon text-danger" onClick={() => handleDelete(ex.name)}><Trash2 size={14} /></button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
