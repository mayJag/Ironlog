import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, GripVertical, Pencil, Search, X, Save, Check, Dumbbell } from 'lucide-react';
import { saveRoutine, getRoutine, generateId } from '../store/db';
import { useExerciseLibrary } from '../data/exercises';
import { useToast } from '../components/Toast';
import styles from './RoutineEditor.module.css';

export default function RoutineEditor() {
  const { routineId } = useParams();
  const navigate = useNavigate();
  const { toast, confirm } = useToast();
  const { exercises: libraryExercises } = useExerciseLibrary();
  const isEditMode = !!routineId;

  // Form State
  const [name, setName] = useState('');
  const [addedExercises, setAddedExercises] = useState([]);
  const [createdAt, setCreatedAt] = useState(null);
  
  // Exercise Selector Modal State
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMuscle, setFilterMuscle] = useState('all');

  // Exercise Edit State (when configure set/reps after selecting)
  const [configuringExercise, setConfiguringExercise] = useState(null); // { name, muscleGroup, equipment, sets, reps, rest }
  const [editingExIndex, setEditingExIndex] = useState(null); // Index if editing an already added exercise

  // Categories & Muscle lists
  const categories = ['all', 'compound', 'isolation', 'plyometric', 'core', 'mobility'];
  const muscles = ['all', 'chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'full_body'];

  useEffect(() => {
    if (isEditMode) {
      loadRoutine();
    }
  }, [routineId]);

  const loadRoutine = async () => {
    try {
      const routine = await getRoutine(routineId);
      if (routine) {
        setName(routine.name);
        setAddedExercises(routine.exercises || []);
        setCreatedAt(routine.createdAt || null);
      }
    } catch (e) {
      console.error("Failed to load routine:", e);
    }
  };

  const handleOpenAddExercise = () => {
    setEditingExIndex(null);
    setConfiguringExercise(null);
    setShowModal(true);
  };

  const handleSelectExercise = (ex) => {
    setConfiguringExercise({
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      equipment: ex.equipment,
      sets: 3,
      reps: '10',
      rest: '90s',
      notes: ''
    });
  };

  const handleConfirmAddExercise = (e) => {
    e.preventDefault();
    if (!configuringExercise) return;

    if (editingExIndex !== null) {
      // Editing existing exercise
      setAddedExercises(prev => prev.map((ex, idx) => {
        if (idx === editingExIndex) {
          return configuringExercise;
        }
        return ex;
      }));
    } else {
      // Adding new exercise
      setAddedExercises(prev => [...prev, configuringExercise]);
    }

    setConfiguringExercise(null);
    setEditingExIndex(null);
    setShowModal(false);
  };

  const handleEditExercise = (idx) => {
    setEditingExIndex(idx);
    setConfiguringExercise(addedExercises[idx]);
    setShowModal(true);
  };

  const handleRemoveExercise = async (idx) => {
    const ok = await confirm({
      title: 'Remove exercise?',
      message: 'This movement will be removed from the routine.',
      confirmLabel: 'Remove',
      danger: true,
    });
    if (ok) {
      setAddedExercises(prev => prev.filter((_, i) => i !== idx));
    }
  };

  // Reorder Exercises (Simple shift up/down)
  const moveExercise = (idx, direction) => {
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= addedExercises.length) return;

    const updated = [...addedExercises];
    const temp = updated[idx];
    updated[idx] = updated[nextIdx];
    updated[nextIdx] = temp;
    setAddedExercises(updated);
  };

  const handleSaveRoutine = async () => {
    if (!name.trim()) {
      toast('Please enter a routine name.', 'warning');
      return;
    }
    if (addedExercises.length === 0) {
      toast('Please add at least one exercise.', 'warning');
      return;
    }

    try {
      const routine = {
        id: isEditMode ? routineId : `routine-${generateId()}`,
        name: name,
        exercises: addedExercises,
        // Preserve original createdAt on edit so the routine keeps its place in
        // the createdAt-indexed list (undefined would drop it from the index).
        createdAt: (isEditMode ? createdAt : Date.now()) || Date.now()
      };

      await saveRoutine(routine);
      toast(`Routine "${name}" saved!`, 'success');
      navigate('/plan'); // Back to Plan view
    } catch (e) {
      console.error(e);
      toast('Failed to save routine.', 'error');
    }
  };

  // Filter master list
  const filteredExercises = libraryExercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || ex.category === filterCategory;
    const matchesMuscle = filterMuscle === 'all' || ex.muscleGroup === filterMuscle;
    return matchesSearch && matchesCategory && matchesMuscle;
  });

  return (
    <div className={`${styles.editorPage} page stagger`}>
      {/* Header */}
      <header className={styles.header}>
        <button className="btn btn--ghost btn--icon" onClick={() => navigate('/plan')}>
          <ArrowLeft size={20} />
        </button>
        <h1 className={styles.title}>{isEditMode ? 'Edit Routine' : 'Create Routine'}</h1>
        <button className="btn btn--ghost text-accent" onClick={handleSaveRoutine}>
          <Save size={20} />
        </button>
      </header>

      {/* Routine Name */}
      <div className={`${styles.inputGroup} card`}>
        <label className={styles.label}>Routine Name</label>
        <input
          type="text"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Push Day, Power Lower, Jump Session"
        />
      </div>

      {/* Exercises List Section */}
      <section className="section" style={{ marginTop: 'var(--sp-4)' }}>
        <div className="section__header">
          <h2 className="section__title">Workout Exercises ({addedExercises.length})</h2>
          <button className="btn btn--secondary btn--sm" onClick={handleOpenAddExercise}>
            <Plus size={14} /> Add Exercise
          </button>
        </div>

        {addedExercises.length > 0 ? (
          <div className={styles.exerciseList}>
            {addedExercises.map((ex, idx) => (
              <div key={idx} className={`${styles.exerciseCard} card`}>
                <div className={styles.cardGripCol}>
                  <GripVertical size={16} className={styles.gripIcon} />
                </div>

                <div className={styles.cardMainInfo}>
                  <span className={styles.exName}>{ex.name}</span>
                  <div className={styles.exSubText}>
                    <span>{ex.sets} sets × {ex.reps} reps</span>
                    <span>•</span>
                    <span>Rest: {ex.rest}</span>
                  </div>
                </div>

                <div className={styles.cardActions}>
                  <div className={styles.orderArrows}>
                    <button 
                      disabled={idx === 0} 
                      onClick={() => moveExercise(idx, -1)}
                      className={styles.arrowBtn}
                    >
                      ▲
                    </button>
                    <button 
                      disabled={idx === addedExercises.length - 1} 
                      onClick={() => moveExercise(idx, 1)}
                      className={styles.arrowBtn}
                    >
                      ▼
                    </button>
                  </div>
                  <button className="btn btn--ghost btn--icon" onClick={() => handleEditExercise(idx)}>
                    <Pencil size={14} />
                  </button>
                  <button className="btn btn--ghost text-danger btn--icon" onClick={() => handleRemoveExercise(idx)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state card">
            <Dumbbell size={32} />
            <h3>No exercises configured</h3>
            <p>Tap "Add Exercise" to add movements to your custom routine.</p>
          </div>
        )}
      </section>

      {/* SAVE CTA BUTTON */}
      <div className={styles.saveBtnBox}>
        <button className="btn btn--primary btn--full" onClick={handleSaveRoutine}>
          Save Routine
        </button>
      </div>

      {/* Add / Config Exercise Overlay Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-handle" />

            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {configuringExercise ? `Configure ${configuringExercise.name}` : 'Select Exercise'}
              </h3>
              <button className="btn btn--ghost btn--icon" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Step 1: Browse Exercises */}
            {!configuringExercise ? (
              <div className={styles.modalBody}>
                {/* Search */}
                <div className={styles.searchBox}>
                  <Search size={16} className={styles.searchIcon} />
                  <input
                    type="text"
                    className="input"
                    style={{ paddingLeft: '36px' }}
                    placeholder="Search master exercises..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Filters */}
                <div className={styles.filtersWrapper}>
                  <div className={styles.filterRow}>
                    <span className={styles.filterLabel}>Type:</span>
                    <div className={styles.filterScroll}>
                      {categories.map(c => (
                        <button
                          key={c}
                          className={`chip ${filterCategory === c ? 'chip--active' : ''}`}
                          onClick={() => setFilterCategory(c)}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.filterRow}>
                    <span className={styles.filterLabel}>Muscle:</span>
                    <div className={styles.filterScroll}>
                      {muscles.map(m => (
                        <button
                          key={m}
                          className={`chip ${filterMuscle === m ? 'chip--active' : ''}`}
                          onClick={() => setFilterMuscle(m)}
                        >
                          {m.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Exercises List */}
                <div className={styles.selectionList}>
                  {filteredExercises.map(ex => (
                    <div 
                      key={ex.name} 
                      className={styles.selectionItem}
                      onClick={() => handleSelectExercise(ex)}
                    >
                      <div className={styles.selMeta}>
                        <span className={styles.selExName}>{ex.name}</span>
                        <span className={styles.selExSub}>{ex.muscleGroup} • {ex.equipment}</span>
                      </div>
                      <Plus size={16} className={styles.selPlusIcon} />
                    </div>
                  ))}
                  {filteredExercises.length === 0 && (
                    <div className="empty-state">
                      <p>No matching exercises found.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Step 2: Configure sets / reps / rest */
              <form className={styles.configForm} onSubmit={handleConfirmAddExercise}>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label className={styles.lbl}>Target Sets</label>
                    <input
                      type="number"
                      className="input"
                      value={configuringExercise.sets}
                      onChange={(e) => setConfiguringExercise({ ...configuringExercise, sets: parseInt(e.target.value) || 3 })}
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.lbl}>Target Reps</label>
                    <input
                      type="text"
                      className="input"
                      value={configuringExercise.reps}
                      onChange={(e) => setConfiguringExercise({ ...configuringExercise, reps: e.target.value })}
                      placeholder="e.g. 10, 8-12, 30s"
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.lbl}>Rest period</label>
                    <select
                      className="select"
                      value={configuringExercise.rest}
                      onChange={(e) => setConfiguringExercise({ ...configuringExercise, rest: e.target.value })}
                    >
                      <option value="30s">30 seconds</option>
                      <option value="60s">60 seconds</option>
                      <option value="90s">90 seconds</option>
                      <option value="120s">120 seconds</option>
                      <option value="180s">180 seconds</option>
                    </select>
                  </div>

                  <div className={styles.fieldFull}>
                    <label className={styles.lbl}>Instruction / Notes</label>
                    <input
                      type="text"
                      className="input"
                      value={configuringExercise.notes}
                      onChange={(e) => setConfiguringExercise({ ...configuringExercise, notes: e.target.value })}
                      placeholder="e.g., Warm up sets first, focus on eccentric phase"
                    />
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button 
                    type="button" 
                    className="btn btn--secondary" 
                    onClick={() => setConfiguringExercise(null)}
                  >
                    Back to Select
                  </button>
                  <button type="submit" className="btn btn--primary">
                    <Check size={16} /> Confirm Add
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
