import React, { useState, useEffect, useRef } from 'react';
import { Scale, Plus, Trash2, Camera, Ruler, Image } from 'lucide-react';
import {
  getAllBodyMetrics, saveBodyMetric, deleteBodyMetric,
  getAllProgressPhotos, saveProgressPhoto, deleteProgressPhoto, generateId,
} from '../store/db';
import { useSettings } from '../store/SettingsContext';
import { useToast } from '../components/Toast';
import { LineChart } from '../components/Charts';
import styles from './Body.module.css';

const todayStr = () => new Date().toISOString().split('T')[0];

export default function Body() {
  const { weightUnit } = useSettings();
  const { toast, confirm } = useToast();
  const [tab, setTab] = useState('metrics');
  const [metrics, setMetrics] = useState([]);
  const [photos, setPhotos] = useState([]);
  const fileRef = useRef(null);

  // entry form
  const [form, setForm] = useState({ date: todayStr(), weight: '', waist: '', chest: '', arms: '' });

  const load = async () => {
    setMetrics(await getAllBodyMetrics());
    setPhotos(await getAllProgressPhotos());
  };
  useEffect(() => { load(); }, []);

  const handleSaveMetric = async () => {
    if (!form.weight && !form.waist && !form.chest && !form.arms) {
      toast('Enter at least one measurement.', 'warning');
      return;
    }
    const entry = {
      date: form.date,
      weight: form.weight ? Number(form.weight) : undefined,
      waist: form.waist ? Number(form.waist) : undefined,
      chest: form.chest ? Number(form.chest) : undefined,
      arms: form.arms ? Number(form.arms) : undefined,
    };
    await saveBodyMetric(entry);
    setForm({ date: todayStr(), weight: '', waist: '', chest: '', arms: '' });
    await load();
    toast('Body entry saved.', 'success');
  };

  const handleDeleteMetric = async (date) => {
    const ok = await confirm({ title: 'Delete entry?', message: `Remove your body log for ${date}?`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    await deleteBodyMetric(date);
    await load();
  };

  const handlePhotoPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) {
      toast('Image too large (max ~6MB).', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      await saveProgressPhoto({ id: generateId(), date: todayStr(), dataUrl: ev.target.result });
      await load();
      toast('Progress photo added.', 'success');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDeletePhoto = async (id) => {
    const ok = await confirm({ title: 'Delete photo?', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    await deleteProgressPhoto(id);
    await load();
  };

  const weightSeries = metrics.filter(m => m.weight != null).map(m => ({ date: m.date, value: m.weight }));
  const latest = metrics[metrics.length - 1];
  const first = metrics.find(m => m.weight != null);
  const delta = latest?.weight != null && first?.weight != null ? latest.weight - first.weight : null;

  return (
    <div className="page stagger">
      <header>
        <h1 className="page-title">Body</h1>
        <p className="page-subtitle">Track bodyweight, measurements and progress photos</p>
      </header>

      <div className="tabs">
        <button className={`tab ${tab === 'metrics' ? 'tab--active' : ''}`} onClick={() => setTab('metrics')}>Measurements</button>
        <button className={`tab ${tab === 'photos' ? 'tab--active' : ''}`} onClick={() => setTab('photos')}>Photos</button>
      </div>

      {tab === 'metrics' && (
        <>
          {weightSeries.length > 0 && (
            <section className="section">
              <div className="card">
                <div className={styles.weightHeader}>
                  <div>
                    <span className={styles.weightNow}>{latest?.weight ?? '—'} {weightUnit}</span>
                    <span className={styles.weightLbl}>Latest bodyweight</span>
                  </div>
                  {delta != null && (
                    <span className={delta <= 0 ? 'text-success' : styles.deltaUp}>
                      {delta > 0 ? '+' : ''}{delta.toFixed(1)} {weightUnit}
                    </span>
                  )}
                </div>
                <LineChart data={weightSeries} unit={` ${weightUnit}`} />
              </div>
            </section>
          )}

          <section className="section card">
            <h2 className={styles.formTitle}><Scale size={16} /> Log entry</h2>
            <div className={styles.formGrid}>
              <label className={styles.f}><span>Date</span>
                <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
              <label className={styles.f}><span>Weight ({weightUnit})</span>
                <input type="number" className="input" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="0" /></label>
              <label className={styles.f}><span>Waist (cm)</span>
                <input type="number" className="input" value={form.waist} onChange={(e) => setForm({ ...form, waist: e.target.value })} placeholder="0" /></label>
              <label className={styles.f}><span>Chest (cm)</span>
                <input type="number" className="input" value={form.chest} onChange={(e) => setForm({ ...form, chest: e.target.value })} placeholder="0" /></label>
              <label className={styles.f}><span>Arms (cm)</span>
                <input type="number" className="input" value={form.arms} onChange={(e) => setForm({ ...form, arms: e.target.value })} placeholder="0" /></label>
            </div>
            <button className="btn btn--primary btn--full" onClick={handleSaveMetric}><Plus size={16} /> Save Entry</button>
          </section>

          <section className="section">
            <div className="section__header"><h2 className="section__title"><Ruler size={15} /> History</h2></div>
            {metrics.length === 0 ? (
              <div className="empty-state card"><Scale size={32} /><h3>No entries yet</h3></div>
            ) : (
              <div className={styles.list}>
                {[...metrics].reverse().map(m => (
                  <div key={m.date} className={`${styles.row} card`}>
                    <span className={styles.rowDate}>{new Date(m.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span className={styles.rowVals}>
                      {m.weight != null && <span>{m.weight}{weightUnit}</span>}
                      {m.waist != null && <span>W {m.waist}</span>}
                      {m.chest != null && <span>C {m.chest}</span>}
                      {m.arms != null && <span>A {m.arms}</span>}
                    </span>
                    <button className="btn btn--ghost btn--icon text-danger" onClick={() => handleDeleteMetric(m.date)}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {tab === 'photos' && (
        <>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhotoPick} />
          <button className="btn btn--primary btn--full section" onClick={() => fileRef.current?.click()}>
            <Camera size={16} /> Add Progress Photo
          </button>
          {photos.length === 0 ? (
            <div className="empty-state card"><Image size={32} /><h3>No photos yet</h3><p>Capture your transformation over time.</p></div>
          ) : (
            <div className={styles.photoGrid}>
              {photos.map(p => (
                <div key={p.id} className={styles.photoCard}>
                  <img src={p.dataUrl} alt={`Progress ${p.date}`} className={styles.photoImg} />
                  <div className={styles.photoMeta}>
                    <span>{new Date(p.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    <button className="text-danger" onClick={() => handleDeletePhoto(p.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
