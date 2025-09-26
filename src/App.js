import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, writeBatch, Timestamp, addDoc, getDocs, where } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ParkingSquare, Car, Users, Settings, FileText, LogOut, Eye, Edit, Trash2, Sparkles, AlertTriangle } from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyDQ7dVK2ljnN_yjTo6D_eKj4pfum--p9vo",
    authDomain: "appdejayllega.firebaseapp.com",
    projectId: "appdejayllega",
    storageBucket: "appdejayllega.appspot.com",
    messagingSenderId: "54993578348",
    appId: "1:54993578348:web:5937ab49e067caa548eb49",
    measurementId: "G-1WGVFFP6DD"
};

// --- CONFIGURACIÓN DE LA API DE GEMINI ---
const GEMINI_API_KEY = "AIzaSyBv0F26EEiHWhIJgJhgP1KiELrNOlViS8c";

// --- Función para llamar a la API de Gemini con reintentos ---
const callGeminiAPI = async (prompt) => {
    if (!GEMINI_API_KEY) {
        throw new Error("API key for Gemini is missing.");
    }
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;
    
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
    };

    let response;
    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
        try {
            response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const result = await response.json();
                if (result.candidates && result.candidates[0].content && result.candidates[0].content.parts[0]) {
                     return result.candidates[0].content.parts[0].text;
                } else {
                    throw new Error("Respuesta inválida de la API de Gemini.");
                }
            } else {
                throw new Error(`Error de red: ${response.status}`);
            }
        } catch (error) {
            console.error(`Intento fallido: ${error.message}`);
            retries--;
            if (retries === 0) throw error;
            await new Promise(res => setTimeout(res, delay));
            delay *= 2; // Backoff exponencial
        }
    }
};


// --- Inicialización de Firebase ---
let app;
let auth;
let db;
let storage;
let firebaseInitialized = false;

if (firebaseConfig.apiKey) {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
        firebaseInitialized = true;
    } catch (error) {
        console.error("Error al inicializar Firebase:", error);
    }
}


// --- Componente Principal de la Aplicación ---
export default function App() {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [appId] = useState('parking-app-prod-v12');

    useEffect(() => {
        if (!firebaseInitialized) {
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const userDocRef = doc(db, `apps/${appId}/users`, currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    setUser(currentUser);
                    setUserData(userDoc.data());
                } else {
                    await signOut(auth);
                }
            } else {
                setUser(null);
                setUserData(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [appId]);

    const handleLogin = async (email, password) => {
        setError('');
        if (!email.trim() || !password.trim()) {
            setError('El email y la contraseña no pueden estar vacíos.');
            return;
        }
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            console.error("Error de autenticación de Firebase:", err.code);
            if (err.code === 'auth/invalid-credential') {
                 setError('Credenciales incorrectas. Asegúrate de que el usuario ha sido creado en Firebase Authentication.');
            } else {
                 setError('Usuario o contraseña incorrectos.');
            }
        }
    };
    
    const handleLogout = async () => {
        await signOut(auth);
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-[#F0EBE3]"><div className="text-xl text-[#5C3D2E]">Cargando...</div></div>;
    }

    return (
        <div className="bg-[#F0EBE3] min-h-screen font-sans text-[#3A3A3A]">
            {user && userData ? (
                <DashboardLayout user={userData} onLogout={handleLogout} appId={appId} />
            ) : (
                <LoginPage onLogin={handleLogin} error={error} />
            )}
        </div>
    );
}


// --- Componentes de la Interfaz ---

function LoginPage({ onLogin, error }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoggingIn(true);
        await onLogin(email, password);
        setIsLoggingIn(false); // Se ejecuta si el login falla y el componente sigue montado
    };
    
    return (
        <div className="flex flex-col items-center justify-center h-screen px-4 ">
            <div className="w-full max-w-sm p-8 bg-white rounded-2xl shadow-lg border border-gray-200 items-center">
                <div className="flex flex-col items-center mb-6">
                   <img src="/logo.png" alt="Deja y Llega Logo" className="w-24 h-24 mb-4"/>
                    <h1 className="text-2xl font-bold text-center text-[#4A2E2E]">Parkin Manager</h1>
                    <p className="text-center text-[#8E7262]">"Deja y Llega"</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[#5C3D2E]">Usuario (Email)</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-[#F9F6F2] border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#8E7262] focus:border-[#8E7262]"
                            placeholder="usuario@ejemplo.com"
                            autoComplete="email"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#5C3D2E]">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-[#F9F6F2] border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#8E7262] focus:border-[#8E7262]"
                            placeholder="••••••••"
                            autoComplete="current-password"
                        />
                    </div>
                     {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                    <button type="submit" disabled={isLoggingIn} className="w-full py-2 px-4 bg-[#2C5F2D] text-white font-semibold rounded-md shadow-sm hover:bg-[#254f26] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2C5F2D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {isLoggingIn ? 'Ingresando...' : 'Ingresar'}
                    </button>
                </form>
            </div>
        </div>
    );
}

function DashboardLayout({ user, onLogout, appId }) {
    const [page, setPage] = useState('dashboard');
    const [showIncidentModal, setShowIncidentModal] = useState(false);

    const renderPageContent = () => {
        switch (page) {
            case 'register':
                return <RegisterVehiclePage appId={appId} loggedInUser={user} />;
            case 'active-spots':
                return <ActiveSpotsPage appId={appId} />;
            case 'reports':
                return <ReportsPage appId={appId} loggedInUser={user}/>;
            case 'users':
                if (user.role !== 'admin') return <div className="text-center p-8">No tienes permiso para ver esta página.</div>;
                return <UserManagementPage appId={appId} currentUser={user}/>;
            case 'settings':
                 if (user.role !== 'admin') return <div className="text-center p-8">No tienes permiso para ver esta página.</div>;
                return <SettingsPage appId={appId} />;
            default:
                return <DashboardPage setPage={setPage} user={user} onReportIncident={() => setShowIncidentModal(true)} />;
        }
    };
    
    return (
        <div className="flex h-screen">
            <aside className="w-64 bg-white shadow-md flex flex-col p-4">
                <div className="flex items-center space-x-2 mb-8">
                     <img src="/logo.png" alt="Logo" className="w-10 h-10"/>
                    <h2 className="text-xl font-bold text-[#4A2E2E]">Deja y Llega</h2>
                </div>
                 <nav className="flex flex-col space-y-2">
                    <button onClick={() => setPage('dashboard')} className={`flex items-center p-2 rounded-md transition-colors w-full text-left ${page === 'dashboard' ? 'bg-[#2C5F2D] text-white' : 'hover:bg-gray-100'}`}><ParkingSquare className="mr-3 flex-shrink-0" size={20}/>Dashboard</button>
                    <button onClick={() => setPage('register')} className={`flex items-center p-2 rounded-md transition-colors w-full text-left ${page === 'register' ? 'bg-[#2C5F2D] text-white' : 'hover:bg-gray-100'}`}><Car className="mr-3 flex-shrink-0" size={20}/>Registrar</button>
                    <button onClick={() => setPage('active-spots')} className={`flex items-center p-2 rounded-md transition-colors w-full text-left ${page === 'active-spots' ? 'bg-[#2C5F2D] text-white' : 'hover:bg-gray-100'}`}><ParkingSquare className="mr-3 flex-shrink-0" size={20}/>Plazas Activas</button>
                    <button onClick={() => setPage('reports')} className={`flex items-center p-2 rounded-md transition-colors w-full text-left ${page === 'reports' ? 'bg-[#2C5F2D] text-white' : 'hover:bg-gray-100'}`}><FileText className="mr-3 flex-shrink-0" size={20}/>Reportes</button>
                    <button onClick={() => setShowIncidentModal(true)} className="flex items-center p-2 rounded-md transition-colors w-full text-left text-yellow-700 hover:bg-yellow-100"><AlertTriangle className="mr-3 flex-shrink-0" size={20}/>Reportar Incidencia</button>
                    {user.role === 'admin' && (
                        <>
                         <button onClick={() => setPage('users')} className={`flex items-center p-2 rounded-md transition-colors w-full text-left ${page === 'users' ? 'bg-[#2C5F2D] text-white' : 'hover:bg-gray-100'}`}><Users className="mr-3 flex-shrink-0" size={20}/>Usuarios</button>
                         <button onClick={() => setPage('settings')} className={`flex items-center p-2 rounded-md transition-colors w-full text-left ${page === 'settings' ? 'bg-[#2C5F2D] text-white' : 'hover:bg-gray-100'}`}><Settings className="mr-3 flex-shrink-0" size={20}/>Configuración</button>
                        </>
                    )}
                </nav>
                 <div className="mt-auto">
                    <div className="p-2 border-t border-gray-200">
                        <p className="text-sm font-semibold">{user.username}</p>
                        <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                    </div>
                    <button onClick={onLogout} className="w-full flex items-center p-2 rounded-md hover:bg-red-100 text-red-600 transition-colors"><LogOut className="mr-3 flex-shrink-0" size={20} />Cerrar Sesión</button>
                </div>
            </aside>
            <main className="flex-1 p-8 overflow-y-auto">
                {renderPageContent()}
            </main>
            {showIncidentModal && <IncidentReportModal appId={appId} user={user} onClose={() => setShowIncidentModal(false)} />}
        </div>
    );
}

function DashboardPage({ setPage, user, onReportIncident }) {
    return (
        <div>
            <h1 className="text-3xl font-bold mb-4">Bienvenido, {user.username}</h1>
            <p className="text-gray-600 mb-8">Selecciona una opción del menú para comenzar.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer" onClick={() => setPage('register')}>
                    <Car size={40} className="text-[#2C5F2D] mb-4"/>
                    <h3 className="text-xl font-bold">Registrar Vehículo</h3>
                    <p className="text-gray-500 mt-2">Da de alta un nuevo vehículo en el sistema.</p>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer" onClick={() => setPage('active-spots')}>
                    <ParkingSquare size={40} className="text-[#2C5F2D] mb-4"/>
                    <h3 className="text-xl font-bold">Plazas Activas</h3>
                    <p className="text-gray-500 mt-2">Consulta y gestiona los vehículos actualmente estacionados.</p>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer" onClick={() => setPage('reports')}>
                    <FileText size={40} className="text-[#2C5F2D] mb-4"/>
                    <h3 className="text-xl font-bold">Reportes y Cierres</h3>
                    <p className="text-gray-500 mt-2">Consulta el historial y realiza tu cierre de caja.</p>
                </div>
                <div className="bg-yellow-50 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border border-yellow-200" onClick={onReportIncident}>
                    <AlertTriangle size={40} className="text-yellow-600 mb-4"/>
                    <h3 className="text-xl font-bold">Reportar Incidencia</h3>
                    <p className="text-gray-500 mt-2">Crea un nuevo reporte de incidencia con ayuda de la IA.</p>
                </div>
            </div>
        </div>
    );
}


function RegisterVehiclePage({ appId, loggedInUser }) {
    const [plate, setPlate] = useState('');
    const [spotNumber, setSpotNumber] = useState('');
    const [vehiclePhoto, setVehiclePhoto] = useState(null);
    const [spotPhoto, setSpotPhoto] = useState(null);
    const [vehicleTypes, setVehicleTypes] = useState([]);
    const [selectedVehicleType, setSelectedVehicleType] = useState('');
    const [ratePackages, setRatePackages] = useState([]);
    const [selectedRatePackage, setSelectedRatePackage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const vehiclePhotoInputRef = useRef(null);
    const spotPhotoInputRef = useRef(null);

    useEffect(() => {
        const unsubVehicleTypes = onSnapshot(collection(db, `apps/${appId}/vehicleTypes`), (snapshot) => {
            setVehicleTypes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        const unsubRatePackages = onSnapshot(collection(db, `apps/${appId}/ratePackages`), (snapshot) => {
            setRatePackages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => {
            unsubVehicleTypes();
            unsubRatePackages();
        };
    }, [appId]);
    
    const handleFileChange = (e, setPhoto) => {
        const file = e.target.files[0];
        if (file) setPhoto(file);
    };

    const uploadPhoto = async (photoFile, path) => {
        if (!photoFile) return null;
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, photoFile);
        return await getDownloadURL(snapshot.ref);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!plate || !spotNumber || !selectedVehicleType || !selectedRatePackage) {
            setError('Todos los campos son obligatorios.');
            return;
        }

        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            const vehiclePhotoName = vehiclePhoto ? `${Date.now()}_${vehiclePhoto.name}` : null;
            const spotPhotoName = spotPhoto ? `${Date.now()}_${spotPhoto.name}` : null;

            const vehiclePhotoURL = await uploadPhoto(vehiclePhoto, `apps/${appId}/vehicles/${vehiclePhotoName}`);
            const spotPhotoURL = await uploadPhoto(spotPhoto, `apps/${appId}/spots/${spotPhotoName}`);

            await addDoc(collection(db, `apps/${appId}/activeVehicles`), {
                plate: plate.toUpperCase(),
                spotNumber,
                vehiclePhotoURL,
                spotPhotoURL,
                entryTime: Timestamp.now(),
                vehicleTypeId: selectedVehicleType,
                ratePackageId: selectedRatePackage,
                registeredBy: loggedInUser.username,
            });
            
            setSuccess(`Vehículo ${plate.toUpperCase()} registrado con éxito.`);
            setPlate('');
            setSpotNumber('');
            setVehiclePhoto(null);
            setSpotPhoto(null);
            setSelectedVehicleType('');
            setSelectedRatePackage('');
            if (vehiclePhotoInputRef.current) vehiclePhotoInputRef.current.value = null;
            if (spotPhotoInputRef.current) spotPhotoInputRef.current.value = null;

        } catch (err) {
            setError('Error al registrar el vehículo. Inténtalo de nuevo.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredPackages = ratePackages.filter(p => p.vehicleTypeId === selectedVehicleType);

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Registrar Nuevo Vehículo</h1>
            <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-lg shadow-md">
                 {error && <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">{error}</div>}
                 {success && <div className="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg" role="alert">{success}</div>}

                {/* Paso 1: Datos del Vehículo */}
                <div>
                    <h2 className="text-xl font-semibold border-b pb-2 mb-4">Paso 1: Datos del Vehículo</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-1">Matrícula</label>
                            <input type="text" value={plate} onChange={e => setPlate(e.target.value)} placeholder="AAA-123-B" className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#8E7262] focus:border-[#8E7262]" />
                        </div>
                        <div>
                             <label className="block text-sm font-medium mb-1">Número de Lugar</label>
                            <input type="text" value={spotNumber} onChange={e => setSpotNumber(e.target.value)} placeholder="Ej. A-05" className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#8E7262] focus:border-[#8E7262]" />
                        </div>
                    </div>
                </div>

                {/* Paso 2: Registro Fotográfico */}
                <div>
                     <h2 className="text-xl font-semibold border-b pb-2 mb-4">Paso 2: Registro Fotográfico</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-1">Foto del Vehículo</label>
                            <input ref={vehiclePhotoInputRef} type="file" accept="image/*" onChange={e => handleFileChange(e, setVehiclePhoto)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#2C5F2D] file:text-white hover:file:bg-[#254f26]"/>
                            {vehiclePhoto && <img src={URL.createObjectURL(vehiclePhoto)} alt="Vista previa vehículo" className="mt-2 h-24 w-auto rounded"/>}
                        </div>
                         <div>
                            <label className="block text-sm font-medium mb-1">Foto del Lugar</label>
                            <input ref={spotPhotoInputRef} type="file" accept="image/*" onChange={e => handleFileChange(e, setSpotPhoto)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#2C5F2D] file:text-white hover:file:bg-[#254f26]"/>
                            {spotPhoto && <img src={URL.createObjectURL(spotPhoto)} alt="Vista previa lugar" className="mt-2 h-24 w-auto rounded"/>}
                        </div>
                    </div>
                </div>
                
                 {/* Paso 3: Asignar Tarifa */}
                <div>
                     <h2 className="text-xl font-semibold border-b pb-2 mb-4">Paso 3: Asignar Tarifa</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                            <label className="block text-sm font-medium mb-1">Tipo de Vehículo</label>
                            <select value={selectedVehicleType} onChange={e => setSelectedVehicleType(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#8E7262] focus:border-[#8E7262]">
                                <option value="">Seleccione un tipo</option>
                                {vehicleTypes.map(vt => <option key={vt.id} value={vt.id}>{vt.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Paquete de Tarifa</label>
                            <select value={selectedRatePackage} onChange={e => setSelectedRatePackage(e.target.value)} disabled={!selectedVehicleType} className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#8E7262] focus:border-[#8E7262] disabled:bg-gray-200">
                                 <option value="">Seleccione un paquete</option>
                                {filteredPackages.map(rp => <option key={rp.id} value={rp.id}>{rp.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <button type="submit" disabled={isLoading} className="w-full py-3 px-4 bg-[#2C5F2D] text-white font-bold rounded-md shadow-sm hover:bg-[#254f26] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2C5F2D] disabled:bg-gray-400">
                    {isLoading ? 'Registrando...' : 'Confirmar y Ocupar Plaza'}
                </button>

            </form>
        </div>
    );
}

function ActiveSpotsPage({ appId }) {
    const [activeVehicles, setActiveVehicles] = useState([]);
    const [ratePackages, setRatePackages] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [costDetails, setCostDetails] = useState(null);
    const [photoModal, setPhotoModal] = useState({isOpen: false, vehicle: null});

    useEffect(() => {
        const qVehicles = query(collection(db, `apps/${appId}/activeVehicles`));
        const unsubVehicles = onSnapshot(qVehicles, (snapshot) => {
            setActiveVehicles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        const qRates = query(collection(db, `apps/${appId}/ratePackages`));
        const unsubRates = onSnapshot(qRates, (snapshot) => {
            const rates = {};
            snapshot.docs.forEach(doc => {
                rates[doc.id] = doc.data();
            });
            setRatePackages(rates);
        });
        return () => {
            unsubVehicles();
            unsubRates();
        };
    }, [appId]);
    
     const calculateCost = (vehicle) => {
        const ratePackage = ratePackages[vehicle.ratePackageId];
        if (!ratePackage) return { total: 0, details: "Paquete de tarifa no encontrado." };

        const now = new Date();
        const entry = vehicle.entryTime.toDate();
        const diffMinutes = Math.floor((now - entry) / (1000 * 60));

        if (ratePackage.type === 'fixed') {
            const packageMinutes = ratePackage.duration * 60;
            if (diffMinutes <= packageMinutes) {
                return { total: ratePackage.price, details: `Tarifa fija: ${ratePackage.name}` };
            }
            const extraMinutes = diffMinutes - packageMinutes;
            const cheapestBlockRate = Object.values(ratePackages).find(p => p.vehicleTypeId === vehicle.vehicleTypeId && p.type === 'block');
            if (!cheapestBlockRate) {
                 return { total: ratePackage.price, details: `Tarifa fija: ${ratePackage.name} (No se encontró tarifa por bloque para el excedente)` };
            }
            const blockDuration = cheapestBlockRate.duration;
            const extraBlocks = Math.floor(extraMinutes / blockDuration);
            const extraCost = extraBlocks * cheapestBlockRate.price;
            return { total: ratePackage.price + extraCost, details: `Tarifa fija + ${extraMinutes.toFixed(0)} min excedente` };
        } else { 
            const blockDuration = ratePackage.duration;
            const blocksCompleted = Math.floor(diffMinutes / blockDuration) + 1;
            const totalCost = (blocksCompleted) * ratePackage.price; 
            return { total: totalCost, details: `${blocksCompleted} bloques de ${blockDuration} min` };
        }
    };

    const handleReleaseClick = (vehicle) => {
        const cost = calculateCost(vehicle);
        setSelectedVehicle(vehicle);
        setCostDetails(cost);
    };

    const confirmRelease = async () => {
        if (!selectedVehicle) return;
        
        const vehicleDocRef = doc(db, `apps/${appId}/activeVehicles`, selectedVehicle.id);
        const currentUser = auth.currentUser;
        let releasedByUsername = 'Sistema';
        if (currentUser) {
            const userDoc = await getDoc(doc(db, `apps/${appId}/users`, currentUser.uid));
            if (userDoc.exists()) {
                releasedByUsername = userDoc.data().username;
            }
        }
        
        const releasedVehicleData = {
            ...selectedVehicle,
            exitTime: Timestamp.now(),
            totalCost: costDetails.total,
            releasedBy: releasedByUsername,
        };

        try {
            await addDoc(collection(db, `apps/${appId}/releasedVehicles`), releasedVehicleData);
            await deleteDoc(vehicleDocRef);
            setSelectedVehicle(null);
            setCostDetails(null);
        } catch (error) {
            console.error("Error al liberar el vehículo:", error);
        }
    };
    
    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Plazas Activas</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {activeVehicles.map(vehicle => (
                    <div key={vehicle.id} className="bg-white p-4 rounded-lg shadow-md flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start">
                                <h3 className="text-lg font-bold text-gray-800">{vehicle.plate}</h3>
                                <span className="text-sm font-semibold bg-[#8E7262] text-white px-2 py-1 rounded-full">{vehicle.spotNumber}</span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">Entrada: {vehicle.entryTime?.toDate().toLocaleString()}</p>
                            <p className="text-sm text-gray-500">Registró: {vehicle.registeredBy}</p>
                             <Timer entryTime={vehicle.entryTime?.toDate()} />
                        </div>
                        <div className="mt-4 flex flex-col space-y-2">
                             <button onClick={() => setPhotoModal({isOpen: true, vehicle: vehicle})} className="w-full py-2 px-4 text-sm bg-gray-200 text-gray-700 font-semibold rounded-md hover:bg-gray-300 transition-colors flex items-center justify-center"><Eye size={16} className="mr-2"/>Ver Fotos</button>
                            <button onClick={() => handleReleaseClick(vehicle)} className="w-full py-2 px-4 text-sm bg-[#2C5F2D] text-white font-semibold rounded-md hover:bg-[#254f26] transition-colors">Liberar Plaza</button>
                        </div>
                    </div>
                ))}
            </div>
            {selectedVehicle && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-xl max-w-sm w-full">
                        <h2 className="text-2xl font-bold mb-4">Confirmar Liberación</h2>
                        <p><strong>Placa:</strong> {selectedVehicle.plate}</p>
                        <p><strong>Costo Total:</strong> <span className="font-bold text-2xl text-[#2C5F2D]">${costDetails.total.toFixed(2)}</span></p>
                        <p className="text-sm text-gray-500 mb-6">Detalles: {costDetails.details}</p>
                        <div className="flex justify-end space-x-4">
                            <button onClick={() => setSelectedVehicle(null)} className="py-2 px-4 bg-gray-300 rounded-md">Cancelar</button>
                            <button onClick={confirmRelease} className="py-2 px-4 bg-[#2C5F2D] text-white rounded-md">Confirmar y Liberar</button>
                        </div>
                    </div>
                </div>
            )}
            {photoModal.isOpen && photoModal.vehicle && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full">
                        <h2 className="text-xl font-bold mb-4">Fotos de Registro: {photoModal.vehicle.plate}</h2>
                        <div className="flex space-x-4">
                            {photoModal.vehicle.vehiclePhotoURL && <div className="flex-1">
                                <h3 className="font-semibold mb-2 text-center">Vehículo</h3>
                                <img src={photoModal.vehicle.vehiclePhotoURL} alt="Vehículo" className="w-full h-auto rounded-md object-cover"/>
                            </div>}
                             {photoModal.vehicle.spotPhotoURL && <div className="flex-1">
                                <h3 className="font-semibold mb-2 text-center">Lugar</h3>
                                <img src={photoModal.vehicle.spotPhotoURL} alt="Lugar" className="w-full h-auto rounded-md object-cover"/>
                            </div>}
                        </div>
                        <button onClick={() => setPhotoModal({isOpen: false, vehicle: null})} className="mt-6 w-full py-2 bg-gray-300 rounded-md">Cerrar</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function Timer({ entryTime }) {
    const [elapsedTime, setElapsedTime] = useState('00:00:00');

    useEffect(() => {
        if (!entryTime) return;
        const interval = setInterval(() => {
            const now = new Date();
            const diff = now - entryTime;
            if (diff < 0) return;
            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setElapsedTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }, 1000);
        return () => clearInterval(interval);
    }, [entryTime]);
    
    return <p className="text-center font-mono text-xl text-gray-700 bg-gray-100 rounded p-2 mt-2">{elapsedTime}</p>;
}

// --- Componente de Reportes con integración de Gemini ---
function ReportsPage({ appId, loggedInUser }) {
    const [releasedVehicles, setReleasedVehicles] = useState([]);
    const [closings, setClosings] = useState([]);
    const [pendingClosing, setPendingClosing] = useState({ count: 0, total: 0 });
    const [tab, setTab] = useState('closings');
    const [summary, setSummary] = useState('');
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState('');

    useEffect(() => {
        const qReleased = query(collection(db, `apps/${appId}/releasedVehicles`));
        const unsubReleased = onSnapshot(qReleased, (snapshot) => {
            setReleasedVehicles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const qClosings = query(collection(db, `apps/${appId}/closings`));
        const unsubClosings = onSnapshot(qClosings, (snapshot) => {
            setClosings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubReleased();
            unsubClosings();
        };
    }, [appId]);
    
    useEffect(() => {
        const myClosings = closings.filter(c => c.username === loggedInUser.username).sort((a,b) => b.timestamp.toDate() - a.timestamp.toDate());
        const lastClosingDate = myClosings.length > 0 ? myClosings[0].timestamp.toDate() : new Date(0);

        const userReleasedSinceLastClosing = releasedVehicles.filter(v => 
            v.releasedBy === loggedInUser.username &&
            v.exitTime.toDate() > lastClosingDate
        );

        const total = userReleasedSinceLastClosing.reduce((sum, v) => sum + v.totalCost, 0);
        setPendingClosing({ count: userReleasedSinceLastClosing.length, total });
    }, [releasedVehicles, closings, loggedInUser]);
    
    const handleClosing = async () => {
        if (pendingClosing.count === 0) return;
        
        await addDoc(collection(db, `apps/${appId}/closings`), {
            username: loggedInUser.username,
            vehicleCount: pendingClosing.count,
            totalAmount: pendingClosing.total,
            timestamp: Timestamp.now()
        });
    };

    const generateDailySummary = async () => {
        setIsSummaryLoading(true);
        setSummaryError('');
        setSummary('');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todaysVehicles = releasedVehicles.filter(v => v.exitTime.toDate() >= today);
        
        if (todaysVehicles.length === 0) {
            setSummaryError("No hay operaciones finalizadas hoy para generar un resumen.");
            setIsSummaryLoading(false);
            return;
        }

        const dataForPrompt = todaysVehicles.map(v => 
            `- Placa: ${v.plate}, Costo: $${v.totalCost.toFixed(2)}, Liberado por: ${v.releasedBy}`
        ).join("\n");

        const prompt = `
            Eres un asistente de gerente para un estacionamiento llamado "Deja y Llega".
            Analiza los siguientes datos de operaciones del día de hoy y genera un resumen ejecutivo breve y profesional.
            
            Datos de hoy:
            ${dataForPrompt}

            En tu resumen, incluye:
            1. El ingreso total del día.
            2. El número total de vehículos atendidos.
            3. Menciona al operador (Liberado por) que atendió más vehículos.
            4. Termina con una nota positiva.
        `;

        try {
            const result = await callGeminiAPI(prompt);
            setSummary(result);
        } catch (error) {
            console.error("Error al generar resumen:", error);
            setSummaryError("No se pudo generar el resumen. Verifica la clave de API de Gemini y la conexión.");
        } finally {
            setIsSummaryLoading(false);
        }
    };


    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Reportes y Cierres de Caja</h1>
             <div className="flex border-b mb-6">
                <button onClick={() => setTab('closings')} className={`py-2 px-4 ${tab === 'closings' ? 'border-b-2 border-[#2C5F2D] font-semibold text-[#2C5F2D]' : 'text-gray-500'}`}>Cierre de Caja</button>
                <button onClick={() => setTab('history')} className={`py-2 px-4 ${tab === 'history' ? 'border-b-2 border-[#2C5F2D] font-semibold text-[#2C5F2D]' : 'text-gray-500'}`}>Historial de Operaciones</button>
                 {loggedInUser.role === 'admin' && <button onClick={() => setTab('summary')} className={`py-2 px-4 ${tab === 'summary' ? 'border-b-2 border-[#2C5F2D] font-semibold text-[#2C5F2D]' : 'text-gray-500'}`}>✨ Resumen IA</button>}
            </div>
            
            {tab === 'summary' && loggedInUser.role === 'admin' && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4">Resumen del Día Generado con IA</h2>
                    <p className="text-sm text-gray-600 mb-4">Analiza las operaciones de hoy para obtener un resumen ejecutivo.</p>
                    <button onClick={generateDailySummary} disabled={isSummaryLoading} className="flex items-center justify-center w-full md:w-auto px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-md hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50">
                        <Sparkles size={18} className="mr-2"/>
                        {isSummaryLoading ? 'Generando...' : 'Generar Resumen del Día'}
                    </button>
                    {summaryError && <p className="text-red-500 mt-4">{summaryError}</p>}
                    {summary && (
                        <div className="mt-6 p-4 border rounded-md bg-gray-50 whitespace-pre-wrap font-mono">
                            {summary}
                        </div>
                    )}
                </div>
            )}


            {tab === 'closings' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Cierre de Caja Pendiente */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold mb-4">Mi Cierre de Caja Pendiente</h2>
                        <p className="text-sm text-gray-600">Vehículos cobrados por ti desde tu último cierre.</p>
                        <div className="my-4 text-center">
                            <p className="text-lg">Total de Vehículos:</p>
                            <p className="text-4xl font-bold text-[#2C5F2D]">{pendingClosing.count}</p>
                            <p className="text-lg mt-4">Monto total de operaciones:</p>
                            <p className="text-4xl font-bold text-[#2C5F2D]">${pendingClosing.total.toFixed(2)}</p>
                        </div>
                        <button onClick={handleClosing} disabled={pendingClosing.count === 0} className="w-full py-2 bg-[#2C5F2D] text-white rounded-md disabled:bg-gray-400 hover:bg-[#254f26] transition-colors">Realizar Cierre</button>
                    </div>
                     {/* Historial de Cierres */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold mb-4">Historial de Mis Cierres</h2>
                        <div className="overflow-y-auto max-h-96">
                        <ul className="divide-y">
                            {closings.filter(c=>c.username === loggedInUser.username).sort((a,b) => b.timestamp.toDate() - a.timestamp.toDate()).map(c => (
                                <li key={c.id} className="py-2">
                                    <p><strong>Fecha:</strong> {c.timestamp.toDate().toLocaleString()}</p>
                                    <p><strong>Monto:</strong> ${c.totalAmount.toFixed(2)} ({c.vehicleCount} vehículos)</p>
                                </li>
                            ))}
                        </ul>
                        </div>
                    </div>
                </div>
            )}

            {tab === 'history' && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                     <h2 className="text-xl font-bold mb-4">Historial de Vehículos Liberados (Todos)</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                             <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Placa</th>
                                    <th scope="col" className="px-6 py-3">Hora Salida</th>
                                    <th scope="col" className="px-6 py-3">Costo</th>
                                    <th scope="col" className="px-6 py-3">Liberado Por</th>
                                </tr>
                            </thead>
                            <tbody>
                                {releasedVehicles.sort((a,b) => b.exitTime.toDate() - a.exitTime.toDate()).map(v => (
                                     <tr key={v.id} className="bg-white border-b">
                                        <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{v.plate}</th>
                                        <td className="px-6 py-4">{v.exitTime.toDate().toLocaleString()}</td>
                                        <td className="px-6 py-4">${v.totalCost.toFixed(2)}</td>
                                        <td className="px-6 py-4">{v.releasedBy}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

function UserManagementPage({ appId, currentUser }) {
    const [users, setUsers] = useState([]);
    
    useEffect(() => {
        const q = query(collection(db, `apps/${appId}/users`));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [appId]);

    const handleDeleteUser = async (userId) => {
        const userToDelete = users.find(u => u.id === userId);
        if (userToDelete && userToDelete.email === currentUser.email) {
            alert("No te puedes eliminar a ti mismo.");
            return;
        }
        if (window.confirm("¿Estás seguro de que quieres eliminar este usuario? Esta acción es irreversible.")) {
            await deleteDoc(doc(db, `apps/${appId}/users`, userId));
            alert("Perfil de usuario eliminado de la base de datos de la app.");
        }
    };
    
    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Gestionar Usuarios</h1>
             <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-sm text-gray-600 mb-4">Para crear y gestionar usuarios (cambiar contraseñas, etc.), debes hacerlo directamente desde el panel de **Firebase Authentication**, como se indica en el manual. Esto garantiza la máxima seguridad.</p>
                <h2 className="text-xl font-bold mb-4">Lista de Perfiles de Usuario en la App</h2>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                         <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Usuario</th>
                                <th scope="col" className="px-6 py-3">Email</th>
                                <th scope="col" className="px-6 py-3">Rol</th>
                                <th scope="col" className="px-6 py-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                 <tr key={user.id} className="bg-white border-b">
                                    <td className="px-6 py-4 font-medium text-gray-900">{user.username}</td>
                                    <td className="px-6 py-4">{user.email}</td>
                                    <td className="px-6 py-4 capitalize">{user.role}</td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => handleDeleteUser(user.id)} className="text-red-500 hover:text-red-700" title="Eliminar perfil de la app">
                                            <Trash2 size={18}/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function SettingsPage({ appId }) {
    const [parkingName, setParkingName] = useState('');
    const [vehicleTypes, setVehicleTypes] = useState([]);
    const [newVehicleType, setNewVehicleType] = useState('');
    const [ratePackages, setRatePackages] = useState([]);
    const [newRatePackage, setNewRatePackage] = useState({ name: '', type: 'block', duration: 30, price: 0, vehicleTypeId: '' });
    
    useEffect(() => {
        const unsubSettings = onSnapshot(doc(db, `apps/${appId}/settings/general`), (doc) => {
            if (doc.exists()) setParkingName(doc.data().name);
        });
         const unsubVehicleTypes = onSnapshot(collection(db, `apps/${appId}/vehicleTypes`), (snapshot) => {
            setVehicleTypes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        const unsubRatePackages = onSnapshot(collection(db, `apps/${appId}/ratePackages`), (snapshot) => {
            setRatePackages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubSettings();
            unsubVehicleTypes();
            unsubRatePackages();
        };
    }, [appId]);
    
    const handleSaveSettings = async () => {
        await setDoc(doc(db, `apps/${appId}/settings/general`), { name: parkingName });
        alert('Nombre guardado.');
    };

    const handleAddVehicleType = async () => {
        if (!newVehicleType) return;
        await addDoc(collection(db, `apps/${appId}/vehicleTypes`), { name: newVehicleType });
        setNewVehicleType('');
    };

    const handleDeleteVehicleType = async (id) => {
        if (!window.confirm("¿Seguro? Se borrarán también las tarifas asociadas a este tipo de vehículo.")) return;
        const batch = writeBatch(db);
        batch.delete(doc(db, `apps/${appId}/vehicleTypes`, id));
        const q = query(collection(db, `apps/${appId}/ratePackages`), where("vehicleTypeId", "==", id));
        const ratesSnapshot = await getDocs(q);
        ratesSnapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    };

    const handleAddRatePackage = async () => {
        if (!newRatePackage.name || !newRatePackage.vehicleTypeId || newRatePackage.price <= 0) {
            alert("Completa todos los campos de la tarifa (Nombre, Tipo de Vehículo y Precio mayor a 0).");
            return;
        }
        await addDoc(collection(db, `apps/${appId}/ratePackages`), { 
            ...newRatePackage, 
            price: Number(newRatePackage.price),
            duration: Number(newRatePackage.duration)
        });
        setNewRatePackage({ name: '', type: 'block', duration: 30, price: 0, vehicleTypeId: '' });
    };

    const handleDeleteRatePackage = async (id) => {
        await deleteDoc(doc(db, `apps/${appId}/ratePackages`, id));
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Configuración y Tarifas</h1>
            <div className="space-y-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4">Ajustes Generales</h2>
                    <label className="block text-sm font-medium">Nombre del Estacionamiento</label>
                    <input type="text" value={parkingName} onChange={e => setParkingName(e.target.value)} className="w-full mt-1 p-2 border rounded" />
                    <button onClick={handleSaveSettings} className="mt-4 px-4 py-2 bg-[#2C5F2D] text-white rounded hover:bg-[#254f26]">Guardar Nombre</button>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                     <h2 className="text-xl font-bold mb-4">Tipos de Vehículo</h2>
                    <ul className="mb-4 space-y-2">
                        {vehicleTypes.map(vt => <li key={vt.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">{vt.name} <button onClick={() => handleDeleteVehicleType(vt.id)}><Trash2 size={16} className="text-red-500"/></button></li>)}
                    </ul>
                    <div className="flex space-x-2">
                        <input type="text" value={newVehicleType} onChange={e => setNewVehicleType(e.target.value)} placeholder="Ej. Motocicleta" className="flex-grow p-2 border rounded" />
                        <button onClick={handleAddVehicleType} className="px-4 py-2 bg-[#2C5F2D] text-white rounded hover:bg-[#254f26]">Agregar</button>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4">Paquetes de Tarifas</h2>
                    <div className="mb-6 space-y-4">
                        {vehicleTypes.map(vt => (
                             <div key={vt.id}>
                                <h3 className="font-semibold text-lg">{vt.name}</h3>
                                <ul className="list-disc list-inside ml-4">
                                    {ratePackages.filter(p => p.vehicleTypeId === vt.id).map(p => (
                                        <li key={p.id} className="flex justify-between items-center text-sm py-1">
                                            <span>{p.name} - ${p.price.toFixed(2)} ({p.type === 'block' ? `por bloque de ${p.duration} min` : `fijo por ${p.duration} hrs`})</span>
                                            <button onClick={() => handleDeleteRatePackage(p.id)}><Trash2 size={16} className="text-red-500"/></button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <div className="border-t pt-4 space-y-4">
                        <h3 className="font-semibold text-lg">Agregar Nueva Tarifa</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                            <select value={newRatePackage.vehicleTypeId} onChange={e => setNewRatePackage({...newRatePackage, vehicleTypeId: e.target.value})} className="p-2 border rounded">
                                <option value="">Seleccionar Vehículo</option>
                                {vehicleTypes.map(vt => <option key={vt.id} value={vt.id}>{vt.name}</option>)}
                            </select>
                             <input type="text" placeholder="Nombre (ej. Tarifa Normal)" value={newRatePackage.name} onChange={e => setNewRatePackage({...newRatePackage, name: e.target.value})} className="p-2 border rounded" />
                             <input type="number" placeholder="Precio" value={newRatePackage.price} onChange={e => setNewRatePackage({...newRatePackage, price: e.target.value})} className="p-2 border rounded" />
                             <select value={newRatePackage.type} onChange={e => setNewRatePackage({...newRatePackage, type: e.target.value})} className="p-2 border rounded">
                                <option value="block">Por Bloque</option>
                                <option value="fixed">Tarifa Fija</option>
                            </select>
                             <select value={newRatePackage.duration} onChange={e => setNewRatePackage({...newRatePackage, duration: e.target.value})} className="p-2 border rounded">
                                {newRatePackage.type === 'block' ? (
                                    <>
                                        <option value={30}>Bloque de 30 min</option>
                                        <option value={60}>Bloque de 1 hora</option>
                                    </>
                                ) : (
                                    <>
                                        <option value={1}>1 Hora</option>
                                        <option value={6}>6 Horas</option>
                                        <option value={12}>12 Horas</option>
                                        <option value={24}>Día Completo (24h)</option>
                                        <option value={168}>Semana (168h)</option>
                                        <option value={720}>Mes (720h)</option>
                                    </>
                                )}
                            </select>
                            <button onClick={handleAddRatePackage} className="px-4 py-2 bg-[#2C5F2D] text-white rounded hover:bg-[#254f26] h-full">Agregar Tarifa</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Componente para Reporte de Incidencias con Gemini ---
function IncidentReportModal({ appId, user, onClose }) {
    const [plate, setPlate] = useState('');
    const [spotNumber, setSpotNumber] = useState('');
    const [notes, setNotes] = useState('');
    const [formalReport, setFormalReport] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const generateReport = async () => {
        if (!notes) {
            setError("Por favor, escribe algunas notas sobre lo que pasó.");
            return;
        }
        setIsLoading(true);
        setError('');
        setFormalReport('');

        const prompt = `
            Actúa como un agente de servicio al cliente para un estacionamiento. Eres profesional, calmado y empático.
            Un cliente ha reportado una incidencia. Basado en las siguientes notas, redacta un reporte de incidencia formal, neutral y bien estructurado.
            
            Notas del operador:
            - Matrícula del vehículo: ${plate || "No especificada"}
            - Número de lugar: ${spotNumber || "No especificado"}
            - Reportado por: ${user.username}
            - Notas: ${notes}

            El reporte debe incluir claramente los siguientes campos:
            - Fecha y Hora del Reporte: (Usa la fecha y hora actual)
            - Matrícula del Vehículo:
            - Ubicación:
            - Reportado por (Operador):
            - Descripción de la Incidencia: (Basado en las notas)
            - Acciones Tomadas: (Si no se mencionan acciones, indica "Se documenta la incidencia para seguimiento.")
            
            IMPORTANTE: No admitas culpa ni especules. Limítate a documentar los hechos descritos en las notas de forma clara y profesional.
        `;

        try {
            const result = await callGeminiAPI(prompt);
            setFormalReport(result);
        } catch (err) {
            setError("No se pudo generar el reporte. Verifica la clave de API y la conexión.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const saveReport = async () => {
        if (!formalReport) return;
        try {
            await addDoc(collection(db, `apps/${appId}/incidents`), {
                reportText: formalReport,
                plate,
                spotNumber,
                reportedBy: user.username,
                createdAt: Timestamp.now()
            });
            alert("Reporte de incidencia guardado con éxito.");
            onClose();
        } catch(err) {
            alert("Error al guardar el reporte.");
            console.error(err);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full">
                <h2 className="text-2xl font-bold mb-4">Generador de Reporte de Incidencia</h2>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" value={plate} onChange={e => setPlate(e.target.value)} placeholder="Matrícula (opcional)" className="p-2 border rounded" />
                        <input type="text" value={spotNumber} onChange={e => setSpotNumber(e.target.value)} placeholder="Lugar (opcional)" className="p-2 border rounded" />
                    </div>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Escribe aquí tus notas sobre el incidente... (ej. Cliente reporta rayón en puerta derecha, se revisan cámaras)" rows="4" className="w-full p-2 border rounded"></textarea>
                    
                    <button onClick={generateReport} disabled={isLoading} className="w-full flex items-center justify-center px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-md hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50">
                        <Sparkles size={18} className="mr-2" />
                        {isLoading ? 'Generando...' : '✨ Generar Reporte Formal'}
                    </button>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    {formalReport && (
                        <div className="mt-4">
                            <h3 className="font-semibold mb-2">Vista Previa del Reporte:</h3>
                            <textarea readOnly value={formalReport} rows="10" className="w-full p-2 border rounded bg-gray-50 font-mono text-sm"></textarea>
                        </div>
                    )}
                </div>
                <div className="flex justify-end space-x-4 mt-6">
                    <button onClick={onClose} className="py-2 px-4 bg-gray-200 rounded-md">Cancelar</button>
                    <button onClick={saveReport} disabled={!formalReport} className="py-2 px-4 bg-[#2C5F2D] text-white rounded-md disabled:bg-gray-400">Guardar Reporte</button>
                </div>
            </div>
        </div>
    );
}