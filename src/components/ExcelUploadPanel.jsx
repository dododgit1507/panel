import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc,
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  Upload, 
  FileSpreadsheet, 
  Users, 
  Check, 
  AlertCircle, 
  Trash2,
  Download,
  Plus,
  Edit2,
  Save,
  X,
  CheckCircle,
  XCircle,
  Clock,
  MessageCircle,
  UserCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import './ExcelUploadPanel.css';

const ExcelUploadPanel = () => {
  const [invitedGuests, setInvitedGuests] = useState([]);
  const [guestResponses, setGuestResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingResponses, setLoadingResponses] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState('invited'); // 'invited' o 'responses'

  // ✅ NUEVO: Estados para CRUD
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [newGuestName, setNewGuestName] = useState('');
  const [editGuestName, setEditGuestName] = useState('');
  const [adding, setAdding] = useState(false);
  const [updating, setUpdating] = useState(false);
  // ✅ NUEVO: Filtro de respuestas
  const [responseFilter, setResponseFilter] = useState('all'); // 'all' | 'accepted' | 'declined' | 'pending'
  // ✅ NUEVO: Búsqueda por nombre
  const [searchQuery, setSearchQuery] = useState('');

  // Escuchar cambios en la base de datos
  useEffect(() => {
    const q = query(collection(db, 'invited_guests'), orderBy('name'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const invitedData = [];
      querySnapshot.forEach((doc) => {
        invitedData.push({ id: doc.id, ...doc.data() });
      });
      setInvitedGuests(invitedData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ✅ NUEVO: Escuchar respuestas de invitados desde la tabla 'guests'
  useEffect(() => {
    // Intentamos ordenar por submittedAt, si no existe por createdAt
    const q = query(collection(db, 'guests'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const responsesData = [];
      querySnapshot.forEach((doc) => {
        responsesData.push({ id: doc.id, ...doc.data() });
      });
      
      // Ordenar manualmente por submittedAt o createdAt (más reciente primero)
      responsesData.sort((a, b) => {
        const aDate = a.submittedAt || a.createdAt;
        const bDate = b.submittedAt || b.createdAt;
        
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        
        // Convertir a timestamp si es necesario
        const aTime = aDate.toDate ? aDate.toDate().getTime() : new Date(aDate).getTime();
        const bTime = bDate.toDate ? bDate.toDate().getTime() : new Date(bDate).getTime();
        
        return bTime - aTime; // Más reciente primero
      });
      
      setGuestResponses(responsesData);
      setLoadingResponses(false);
      console.log('Respuestas cargadas:', responsesData); // Para debug
    });

    return () => unsubscribe();
  }, []);

  // ✅ NUEVO: Funciones auxiliares para estadísticas
  const getResponseStats = () => {
    const accepted = guestResponses.filter(guest => guest.confirmed === true).length;
    const declined = guestResponses.filter(guest => guest.confirmed === false).length;
    const pending = getPendingGuests().length;
    
    return { accepted, declined, pending, total: invitedGuests.length };
  };

  // ✅ NUEVO: Utilidades para filtros
  const normalizeName = (name) => (name || '').toString().trim().toLowerCase();
  const matchesSearch = (name) =>
    normalizeName(name).includes(normalizeName(searchQuery));

  const getPendingGuests = () => {
    if (!invitedGuests || !guestResponses) return [];
    return invitedGuests.filter(inv =>
      !guestResponses.some(res => normalizeName(res.name) === normalizeName(inv.name))
    );
  };

  const getResponsesToShow = () => {
    if (responseFilter === 'accepted') return guestResponses.filter(r => r.confirmed === true);
    if (responseFilter === 'declined') return guestResponses.filter(r => r.confirmed === false);
    if (responseFilter === 'pending') return getPendingGuests();
    return guestResponses;
  };

  // ✅ NUEVO: Formatear fecha
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Sin fecha';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // ✅ NUEVO: Agregar invitado individual
  const handleAddGuest = async () => {
    if (!newGuestName.trim()) {
      alert('Por favor ingresa un nombre');
      return;
    }

    // Verificar si ya existe
    const exists = invitedGuests.find(guest => 
      guest.name.toLowerCase() === newGuestName.trim().toLowerCase()
    );
    
    if (exists) {
      alert('Este invitado ya existe en la lista');
      return;
    }

    setAdding(true);
    try {
      await addDoc(collection(db, 'invited_guests'), {
        name: newGuestName.trim(),
        email: '',
        phone: '',
        createdAt: serverTimestamp(),
        addedBy: 'manual_add'
      });
      
      setNewGuestName('');
      setShowAddForm(false);
      alert('Invitado agregado exitosamente');
    } catch (error) {
      console.error('Error agregando invitado:', error);
      alert('Error al agregar invitado');
    } finally {
      setAdding(false);
    }
  };

  // ✅ NUEVO: Iniciar edición
  const startEdit = (guest) => {
    setEditingGuest(guest.id);
    setEditGuestName(guest.name);
  };

  // ✅ NUEVO: Cancelar edición
  const cancelEdit = () => {
    setEditingGuest(null);
    setEditGuestName('');
  };

  // ✅ NUEVO: Guardar edición
  const handleUpdateGuest = async (guestId) => {
    if (!editGuestName.trim()) {
      alert('El nombre no puede estar vacío');
      return;
    }

    // Verificar si el nuevo nombre ya existe (en otro invitado)
    const exists = invitedGuests.find(guest => 
      guest.id !== guestId && 
      guest.name.toLowerCase() === editGuestName.trim().toLowerCase()
    );
    
    if (exists) {
      alert('Ya existe un invitado con ese nombre');
      return;
    }

    setUpdating(true);
    try {
      await updateDoc(doc(db, 'invited_guests', guestId), {
        name: editGuestName.trim(),
        updatedAt: serverTimestamp()
      });
      
      setEditingGuest(null);
      setEditGuestName('');
      alert('Invitado actualizado exitosamente');
    } catch (error) {
      console.error('Error actualizando invitado:', error);
      alert('Error al actualizar invitado');
    } finally {
      setUpdating(false);
    }
  };

  // Procesar archivo Excel
  const processExcelFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // Extraer nombres
          const names = [];
          jsonData.forEach(row => {
            if (row && row.length > 0) {
              const name = row[0];
              if (name && typeof name === 'string' && name.trim().length > 0) {
                const cleanName = name.trim();
                if (cleanName !== 'Nombre' && cleanName !== 'NOMBRE' && cleanName !== 'nombre') {
                  names.push(cleanName);
                }
              }
            }
          });
          
          resolve(names);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);
    });
  };

  // Subir nombres a Firebase
  const uploadNamesToFirebase = async (names) => {
    const results = {
      total: names.length,
      added: 0,
      duplicates: 0,
      errors: 0
    };

    for (const name of names) {
      try {
        // Verificar si ya existe
        const exists = invitedGuests.find(guest => 
          guest.name.toLowerCase() === name.toLowerCase()
        );
        
        if (exists) {
          results.duplicates++;
        } else {
          await addDoc(collection(db, 'invited_guests'), {
            name: name,
            email: '',
            phone: '',
            createdAt: serverTimestamp(),
            addedBy: 'excel_upload'
          });
          results.added++;
        }
      } catch (error) {
        results.errors++;
      }
    }

    return results;
  };

  // Manejar subida de archivo
  const handleFileUpload = async (file) => {
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      alert('Por favor selecciona un archivo Excel (.xlsx o .xls)');
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const names = await processExcelFile(file);
      
      if (names.length === 0) {
        alert('No se encontraron nombres en el archivo Excel');
        setUploading(false);
        return;
      }

      const result = await uploadNamesToFirebase(names);
      setUploadResult(result);
      
    } catch (error) {
      console.error('Error procesando archivo:', error);
      alert('Error al procesar el archivo Excel');
    } finally {
      setUploading(false);
    }
  };

  // Drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  // Eliminar invitado
  const handleDeleteGuest = async (guestId, guestName) => {
    if (window.confirm(`¿Eliminar a ${guestName} de la lista?`)) {
      try {
        await deleteDoc(doc(db, 'invited_guests', guestId));
        alert('Invitado eliminado exitosamente');
      } catch (error) {
        console.error('Error eliminando invitado:', error);
        alert('Error al eliminar invitado');
      }
    }
  };

  // Limpiar toda la lista
  const handleClearAll = async () => {
    if (window.confirm(`¿Estás seguro de eliminar TODOS los ${invitedGuests.length} invitados?`)) {
      try {
        const deletePromises = invitedGuests.map(guest => 
          deleteDoc(doc(db, 'invited_guests', guest.id))
        );
        await Promise.all(deletePromises);
        alert('Lista limpiada exitosamente');
      } catch (error) {
        console.error('Error limpiando lista:', error);
        alert('Error al limpiar la lista');
      }
    }
  };

  // Descargar plantilla
  const downloadTemplate = () => {
    const template = [
      ['Nombre'],
      ['María García López'],
      ['Juan Carlos Pérez'],
      ['Ana Beatriz Martínez'],
      ['Carlos Eduardo Rodríguez']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invitados');
    XLSX.writeFile(wb, 'plantilla_invitados.xlsx');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <Users size={64} />
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-container">
      <div className="panel-content">
        
        {/* Header */}
        <div className="panel-header">
          <h1>Panel de Control - Lista de Invitados</h1>
          <p>Gestiona la lista de invitados permitidos para la boda</p>
        </div>

        {/* ✅ NUEVO: Pestañas de navegación */}
        <div className="tabs-container">
          <button 
            className={`tab ${activeTab === 'invited' ? 'active' : ''}`}
            onClick={() => setActiveTab('invited')}
          >
            <Users size={20} />
            Lista de Invitados ({invitedGuests.length})
          </button>
          <button 
            className={`tab ${activeTab === 'responses' ? 'active' : ''}`}
            onClick={() => setActiveTab('responses')}
          >
            <UserCheck size={20} />
            Respuestas ({guestResponses.length})
          </button>
        </div>

        {/* Contenido condicional según la pestaña activa */}
        {activeTab === 'invited' ? (
          <>
            {/* Estadísticas */}
            <div className="stats-section">
              <div className="stats-header">
                <h2>Resumen</h2>
                <div className="stats-actions">
                  {/* ✅ NUEVO: Botón Agregar */}
                  <button 
                    onClick={() => setShowAddForm(true)} 
                    className="btn btn-primary"
                    style={{marginRight: '10px'}}
                  >
                    <Plus size={16} />
                    Agregar Invitado
                  </button>
                  
                  {invitedGuests.length > 0 && (
                    <button onClick={handleClearAll} className="btn btn-danger">
                      <Trash2 size={16} />
                      Limpiar Lista
                    </button>
                  )}
                </div>
              </div>
              
              <div className="stats-grid">
                <div className="stat-card stat-blue">
                  <Users size={32} />
                  <div>
                    <p>Total Invitados Permitidos</p>
                    <span className="stat-number">{invitedGuests.length}</span>
                  </div>
                </div>
                
                <div className="stat-card stat-green">
                  <Check size={32} />
                  <div>
                    <p>Lista Actualizada</p>
                    <span className="stat-text">
                      {invitedGuests.length > 0 ? 'Lista cargada' : 'Sin cargar'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ✅ NUEVO: Formulario para agregar invitado */}
            {showAddForm && (
              <div className="add-form-section">
                <div className="add-form-header">
                  <h3>Agregar Nuevo Invitado</h3>
                  <button 
                    onClick={() => {setShowAddForm(false); setNewGuestName('');}} 
                    className="btn-close"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="add-form-content">
                  <div className="form-group">
                    <input
                      type="text"
                      value={newGuestName}
                      onChange={(e) => setNewGuestName(e.target.value)}
                      placeholder="Nombre completo del invitado"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddGuest()}
                      style={{flex: 1, marginRight: '10px'}}
                    />
                    <button
                      onClick={handleAddGuest}
                      disabled={adding || !newGuestName.trim()}
                      className="btn btn-primary"
                    >
                      {adding ? 'Agregando...' : 'Agregar'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Zona de subida */}
            <div className="upload-section">
              <div className="upload-header">
                <h2>Subir Lista de Excel</h2>
                <button onClick={downloadTemplate} className="btn btn-secondary">
                  <Download size={16} />
                  Descargar Plantilla
                </button>
              </div>

              <div
                className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <div className="upload-content">
                  <FileSpreadsheet size={64} />
                  
                  {uploading ? (
                    <div className="uploading">
                      <div className="spinner"></div>
                      <p className="upload-title">Procesando archivo...</p>
                      <p className="upload-subtitle">Extrayendo nombres y subiendo a la base de datos</p>
                    </div>
                  ) : (
                    <div className="upload-ready">
                      <p className="upload-title">Arrastra tu archivo Excel aquí</p>
                      <p className="upload-subtitle">o haz click para seleccionar (formatos: .xlsx, .xls)</p>
                      
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => handleFileUpload(e.target.files[0])}
                        className="file-input"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="btn btn-primary">
                        <Upload size={20} />
                        Seleccionar Archivo
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Instrucciones */}
              <div className="instructions">
                <AlertCircle size={20} />
                <div>
                  <p className="instructions-title">Instrucciones:</p>
                  <ul>
                    <li>El archivo debe ser Excel (.xlsx o .xls)</li>
                    <li>Los nombres deben estar en la primera columna</li>
                    <li>Un nombre por fila</li>
                    <li>Se ignorarán nombres duplicados</li>
                  </ul>
                </div>
              </div>

              {/* Resultado */}
              {uploadResult && (
                <div className="result">
                  <Check size={20} />
                  <div>
                    <p className="result-title">Resultado de la subida:</p>
                    <div className="result-grid">
                      <div>
                        <span>Total procesados:</span>
                        <span>{uploadResult.total}</span>
                      </div>
                      <div>
                        <span>Agregados:</span>
                        <span className="text-green">{uploadResult.added}</span>
                      </div>
                      <div>
                        <span>Duplicados:</span>
                        <span className="text-yellow">{uploadResult.duplicates}</span>
                      </div>
                      <div>
                        <span>Errores:</span>
                        <span className="text-red">{uploadResult.errors}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Lista actual */}
            {invitedGuests.length > 0 && (
              <div className="guests-section">
                <h2>Lista Actual de Invitados Permitidos ({invitedGuests.length})</h2>
                {/* ✅ NUEVO: Buscador en invitados */}
                <div style={{ display: 'flex', marginBottom: '12px' }}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre..."
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                  />
                </div>
                
                <div className="guests-list">
                  {invitedGuests
                    .filter((guest) => matchesSearch(guest.name))
                    .map((guest, index) => (
                    <div key={guest.id} className="guest-item">
                      <div className="guest-info">
                        <span className="guest-number">
                          {String(index + 1).padStart(3, '0')}
                        </span>
                        
                        {/* ✅ NUEVO: Edición inline */}
                        {editingGuest === guest.id ? (
                          <input
                            type="text"
                            value={editGuestName}
                            onChange={(e) => setEditGuestName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleUpdateGuest(guest.id)}
                            className="edit-input"
                            autoFocus
                          />
                        ) : (
                          <span className="guest-name">{guest.name}</span>
                        )}
                      </div>
                      
                      <div className="guest-actions">
                        {editingGuest === guest.id ? (
                          <>
                            <button
                              onClick={() => handleUpdateGuest(guest.id)}
                              disabled={updating}
                              className="btn-save"
                              title="Guardar cambios"
                            >
                              <Save size={16} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="btn-cancel"
                              title="Cancelar edición"
                            >
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(guest)}
                              className="btn-edit"
                              title="Editar nombre"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteGuest(guest.id, guest.name)}
                              className="btn-delete"
                              title="Eliminar invitado"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* ✅ NUEVO: Sección de Respuestas */}
            {loadingResponses ? (
              <div className="loading-container">
                <div className="loading-content">
                  <MessageCircle size={64} />
                  <p>Cargando respuestas...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Estadísticas de respuestas */}
                <div className="stats-section">
                  <div className="stats-header">
                    <h2>Estadísticas de Respuestas</h2>
                  </div>
                  
                  <div className="stats-grid">
                    <div className="stat-card stat-green">
                      <CheckCircle size={32} />
                      <div>
                        <p>Confirmaron Asistencia</p>
                        <span className="stat-number">{getResponseStats().accepted}</span>
                      </div>
                    </div>
                    
                    <div className="stat-card stat-red">
                      <XCircle size={32} />
                      <div>
                        <p>No Asistirán</p>
                        <span className="stat-number">{getResponseStats().declined}</span>
                      </div>
                    </div>
                    
                    <div className="stat-card stat-yellow">
                      <Clock size={32} />
                      <div>
                        <p>Sin Responder</p>
                        <span className="stat-number">{getResponseStats().pending}</span>
                      </div>
                    </div>
                    
                    <div className="stat-card stat-blue">
                      <Users size={32} />
                      <div>
                        <p>Total Respuestas</p>
                        <span className="stat-number">{guestResponses.length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lista de respuestas y filtros */}
                {guestResponses.length > 0 || getPendingGuests().length > 0 ? (
                  <div className="responses-section">
                    <h2>Respuestas de Invitados ({getResponsesToShow().length})</h2>

                    {/* ✅ NUEVO: Controles de filtro */}
                    <div className="filters" style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <button className={`btn ${responseFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setResponseFilter('all')}>
                        Todos ({guestResponses.length})
                      </button>
                      <button className={`btn ${responseFilter === 'accepted' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setResponseFilter('accepted')}>
                        Sí ({getResponseStats().accepted})
                      </button>
                      <button className={`btn ${responseFilter === 'declined' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setResponseFilter('declined')}>
                        No ({getResponseStats().declined})
                      </button>
                      <button className={`btn ${responseFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setResponseFilter('pending')}>
                        Sin responder ({getPendingGuests().length})
                      </button>
                      {/* ✅ NUEVO: Buscador en respuestas */}
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por nombre..."
                        style={{ flex: 1, minWidth: '220px', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                      />
                    </div>
                    
                    <div className="responses-list">
                      {getResponsesToShow()
                        .filter((item) => matchesSearch(item.name))
                        .map((item, index) => (
                        <div
                          key={item.id || item.name}
                          className={`response-item ${responseFilter === 'pending' ? 'pending' : item.confirmed ? 'attending' : 'not-attending'}`}
                        >
                          <div className="response-info">
                            <span className="response-number">
                              {String(index + 1).padStart(3, '0')}
                            </span>
                            
                            <div className="response-details">
                              <div className="response-header">
                                <span className="response-name">{responseFilter === 'pending' ? (item.name || 'Sin nombre') : (item.name || 'Sin nombre')}</span>
                                <div className="response-status">
                                  {responseFilter === 'pending' ? (
                                    <>
                                      <Clock size={20} className="status-icon pending" />
                                      <span className="status-text pending">Sin responder</span>
                                    </>
                                  ) : item.confirmed ? (
                                    <>
                                      <CheckCircle size={20} className="status-icon accepted" />
                                      <span className="status-text accepted">Confirmó asistencia</span>
                                    </>
                                  ) : (
                                    <>
                                      <XCircle size={20} className="status-icon declined" />
                                      <span className="status-text declined">No asistirá</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              {responseFilter !== 'pending' && (
                                <>
                                  <div className="response-meta">
                                    <span className="response-date">
                                      📅 {formatDate(item.submittedAt || item.createdAt)}
                                    </span>
                                    {item.email && (
                                      <span className="response-email">
                                        📧 {item.email}
                                      </span>
                                    )}
                                    {item.phone && (
                                      <span className="response-phone">
                                        📱 {item.phone}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {item.message && (
                                    <div className="response-message">
                                      <MessageCircle size={16} />
                                      <span>"{item.message}"</span>
                                    </div>
                                  )}
                                  
                                  {item.companions && item.companions > 0 && (
                                    <div className="response-companions">
                                      <Users size={16} />
                                      <span>Acompañantes: {item.companions}</span>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="no-responses">
                    <MessageCircle size={64} />
                    <h3>No hay respuestas aún</h3>
                    <p>Los invitados aún no han respondido a la invitación</p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ExcelUploadPanel;