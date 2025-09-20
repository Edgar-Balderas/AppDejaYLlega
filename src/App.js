import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics"; // Importa getAnalytics
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// --- Firebase Configuration ---
// NOTE: Reemplaza esto con tu configuración real de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDQ7dVK2ljnN_yjTo6D_eKj4pfum--p9vo",
    authDomain: "appdejayllega.firebaseapp.com",
    projectId: "appdejayllega",
    storageBucket: "appdejayllega.firebasestorage.app",
    messagingSenderId: "54993578348",
    appId: "1:54993578348:web:5937ab49e067caa548eb49",
    measurementId: "G-1WGVFFP6DD"
};

// --- Initialize Firebase ---
let app;
let auth;
let db;
let analytics; // Declara analytics con let

// Inicializa Firebase solo si la configuración no son los valores de marcador de posición
if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    analytics = getAnalytics(app); // Inicializa analytics dentro del if
}


// --- Helper Functions ---
const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos Días';
    if (hour < 18) return 'Buenas Tardes';
    return 'Buenas Noches';
};

// --- Components ---

const AddTransaction = ({ userId }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Comida');
    const [type, setType] = useState('expense');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!description || !amount || !category) {
            setError('Por favor, llena todos los campos.');
            return;
        }
        if (isNaN(parseFloat(amount))) {
            setError('Por favor, introduce un número válido para el monto.');
            return;
        }
        setError('');
        try {
            await addDoc(collection(db, `users/${userId}/transactions`), {
                description,
                amount: parseFloat(amount),
                category,
                type,
                date: serverTimestamp(),
            });
            setDescription('');
            setAmount('');
        } catch (err) {
            console.error("Error al agregar documento: ", err);
            setError('Fallo al agregar la transacción.');
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Agregar Nueva Transacción</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descripción</label>
                    <input
                        type="text"
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="ej., Café"
                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Monto</label>
                    <input
                        type="number"
                        id="amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="ej., 4.50"
                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>
                <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">Categoría</label>
                    <select
                        id="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                        <option>Comida</option>
                        <option>Transporte</option>
                        <option>Compras</option>
                        <option>Cuentas</option>
                        <option>Entretenimiento</option>
                        <option>Salario</option>
                        <option>Otro</option>
                    </select>
                </div>
                <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                        <input
                            type="radio"
                            value="expense"
                            checked={type === 'expense'}
                            onChange={(e) => setType(e.target.value)}
                            className="form-radio h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                        />
                        <span className="ml-2 text-sm text-gray-700">Gasto</span>
                    </label>
                    <label className="flex items-center">
                        <input
                            type="radio"
                            value="income"
                            checked={type === 'income'}
                            onChange={(e) => setType(e.target.value)}
                            className="form-radio h-4 w-4 text-green-600 transition duration-150 ease-in-out"
                        />
                        <span className="ml-2 text-sm text-gray-700">Ingreso</span>
                    </label>
                </div>
                <button
                    type="submit"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Agregar Transacción
                </button>
            </form>
        </div>
    );
};

const TransactionList = ({ transactions, setEditingTransaction, deleteTransaction }) => (
    <div className="bg-white p-6 rounded-lg shadow-md mt-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Transacciones Recientes</h2>
        <ul className="divide-y divide-gray-200">
            {transactions.slice(0, 5).map((transaction) => (
                <li key={transaction.id} className="py-4 flex justify-between items-center">
                    <div>
                        <p className="text-lg font-medium text-gray-900">{transaction.description}</p>
                        <p className="text-sm text-gray-500">{transaction.category} - {new Date(transaction.date?.seconds * 1000).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                        <p className={`text-lg font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                        </p>
                         <div className="flex space-x-2 mt-1">
                            <button onClick={() => setEditingTransaction(transaction)} className="text-xs text-blue-500 hover:text-blue-700">Editar</button>
                            <button onClick={() => deleteTransaction(transaction.id)} className="text-xs text-red-500 hover:red-blue-700">Borrar</button>
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    </div>
);

const Summary = ({ transactions }) => {
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0);

    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);

    const balance = totalIncome - totalExpense;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-green-100 p-6 rounded-lg shadow-md text-center">
                <h3 className="text-lg font-medium text-green-800">Ingresos Totales</h3>
                <p className="text-3xl font-bold text-green-600 mt-2">${totalIncome.toFixed(2)}</p>
            </div>
            <div className="bg-red-100 p-6 rounded-lg shadow-md text-center">
                <h3 className="text-lg font-medium text-red-800">Gastos Totales</h3>
                <p className="text-3xl font-bold text-red-600 mt-2">${totalExpense.toFixed(2)}</p>
            </div>
            <div className="bg-blue-100 p-6 rounded-lg shadow-md text-center">
                <h3 className="text-lg font-medium text-blue-800">Balance</h3>
                <p className={`text-3xl font-bold mt-2 ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    ${balance.toFixed(2)}
                </p>
            </div>
        </div>
    );
};

const EditTransactionModal = ({ transaction, setEditingTransaction, userId }) => {
    const [description, setDescription] = useState(transaction.description);
    const [amount, setAmount] = useState(transaction.amount);
    const [category, setCategory] = useState(transaction.category);
    const [type, setType] = useState(transaction.type);
    const modalRef = useRef();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setEditingTransaction(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [setEditingTransaction]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        const transactionRef = doc(db, `users/${userId}/transactions`, transaction.id);
        try {
            await updateDoc(transactionRef, {
                description,
                amount: parseFloat(amount),
                category,
                type
            });
            setEditingTransaction(null);
        } catch (error) {
            console.error("Error al actualizar documento: ", error);
        }
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div ref={modalRef} className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">Editar Transacción</h2>
                <form onSubmit={handleUpdate} className="space-y-4">
                     <div>
                        <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">Descripción</label>
                        <input id="edit-description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                     <div>
                        <label htmlFor="edit-amount" className="block text-sm font-medium text-gray-700">Monto</label>
                        <input id="edit-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                    <div>
                        <label htmlFor="edit-category" className="block text-sm font-medium text-gray-700">Categoría</label>
                        <select id="edit-category" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                            <option>Comida</option>
                            <option>Transporte</option>
                            <option>Compras</option>
                            <option>Cuentas</option>
                            <option>Entretenimiento</option>
                            <option>Salario</option>
                            <option>Otro</option>
                        </select>
                    </div>
                    <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                            <input type="radio" value="expense" checked={type === 'expense'} onChange={e => setType(e.target.value)} className="form-radio" />
                            <span className="ml-2">Gasto</span>
                        </label>
                         <label className="flex items-center">
                            <input type="radio" value="income" checked={type === 'income'} onChange={e => setType(e.target.value)} className="form-radio" />
                            <span className="ml-2">Ingreso</span>
                        </label>
                    </div>
                    <div className="flex justify-end space-x-4 mt-6">
                        <button type="button" onClick={() => setEditingTransaction(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Actualizar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Dashboard = ({ transactions, userId, setPage, setEditingTransaction, deleteTransaction }) => {
    
    useEffect(() => {
        if (!userId) return;

        setLoading(true);
        const q = query(collection(db, `users/${userId}/transactions`), orderBy('date', 'desc'));
        const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
            const transactionsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTransactions(transactionsData);
            setLoading(false);
        }, (error) => {
            console.error("Error de snapshot en Firestore:", error);
            setLoading(false);
        });

        return () => unsubscribeFirestore();
    }, [userId]);

    return (
        <>
            <Summary transactions={transactions} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <AddTransaction userId={userId} />
                <TransactionList 
                    transactions={transactions} 
                    setEditingTransaction={setEditingTransaction}
                    deleteTransaction={deleteTransaction}
                />
            </div>
        </>
    );
};

const ReportsPage = ({ transactions, setPage }) => {
    const expenseData = {
        labels: [...new Set(transactions.filter(t => t.type === 'expense').map(t => t.category))],
        datasets: [{
            label: 'Gastos por Categoría',
            data: [...new Set(transactions.filter(t => t.type === 'expense').map(t => t.category))].map(category =>
                transactions.filter(t => t.type === 'expense' && t.category === category).reduce((sum, t) => sum + t.amount, 0)
            ),
            backgroundColor: [
                'rgba(255, 99, 132, 0.6)',
                'rgba(54, 162, 235, 0.6)',
                'rgba(255, 206, 86, 0.6)',
                'rgba(75, 192, 192, 0.6)',
                'rgba(153, 102, 255, 0.6)',
                'rgba(255, 159, 64, 0.6)'
            ],
        }]
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Reportes</h1>
                <button onClick={() => setPage('dashboard')} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                    Volver al Dashboard
                </button>
            </div>
            
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-700 mb-4">Desglose de Gastos</h2>
                <div className="h-96">
                   <Bar data={expenseData} options={{ maintainAspectRatio: false }} />
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-bold text-gray-700 mb-4">Todas las Transacciones</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-lg shadow-md">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {transactions.map((transaction) => (
                                <tr key={transaction.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{new Date(transaction.date?.seconds * 1000).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{transaction.description}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                        ${transaction.amount.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{transaction.category}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {transaction.type}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


// --- Main App Component ---
export default function App() {
    const [userId, setUserId] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState('dashboard'); // 'dashboard' or 'reports'
    const [editingTransaction, setEditingTransaction] = useState(null);

    // Muestra un mensaje de error si la configuración de Firebase no está completa.
    if (!app) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <div className="text-center p-8 bg-white shadow-lg rounded-lg max-w-lg mx-4">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Error de Configuración de Firebase</h1>
                    <p className="text-gray-700">
                        Por favor, reemplaza los valores de marcador de posición en el objeto `firebaseConfig`
                        dentro del archivo de código con tu propia configuración de proyecto de Firebase para que la aplicación funcione.
                    </p>
                    <p className="mt-4 text-sm text-gray-500">
                        Busca la variable `firebaseConfig` al inicio del código.
                    </p>
                </div>
            </div>
        );
    }

    useEffect(() => {
        if(!app) return;

        const unsubscribeAuth = onAuthStateChanged(auth, user => {
            if (user) {
                setUserId(user.uid);
            } else {
                signInAnonymously(auth).catch(error => {
                    console.error("Fallo el inicio de sesión anónimo:", error);
                });
            }
        });
        return () => unsubscribeAuth();
    }, [app]);

    

    if (loading && userId) {
        return <div className="flex justify-center items-center h-screen bg-gray-50"><div className="text-xl font-semibold">Cargando...</div></div>;
    }

    return (
        <div className="bg-gray-50 min-h-screen font-sans">
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-extrabold text-gray-800">¡{getGreeting()}!</h1>
                        <p className="text-gray-500 mt-1">Aquí está tu resumen financiero.</p>
                    </div>
                     <nav>
                        <button 
                            onClick={() => setPage(page === 'dashboard' ? 'reports' : 'dashboard')}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            {page === 'dashboard' ? 'Ver Reportes' : 'Ver Dashboard'}
                        </button>
                    </nav>
                </header>

                <main>
                    {page === 'dashboard' ? (
                        <Dashboard 
                            transactions={transactions} 
                            userId={userId} 
                            setPage={setPage}
                            setEditingTransaction={setEditingTransaction}
                            deleteTransaction={deleteTransaction}
                        />
                    ) : (
                        <ReportsPage transactions={transactions} setPage={setPage} />
                    )}
                </main>
            </div>
            {editingTransaction && (
                <EditTransactionModal 
                    transaction={editingTransaction} 
                    setEditingTransaction={setEditingTransaction}
                    userId={userId}
                />
            )}
        </div>
    );
}