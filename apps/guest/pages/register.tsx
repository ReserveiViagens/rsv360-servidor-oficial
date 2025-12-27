import React, { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await axios.post('/api/core/users/', { email, password, fullName });
            router.push('/login'); // Redirect to login page after successful registration
        } catch (err) {
            setError('Falha ao registrar. Por favor, tente novamente.');
        }
    };

    return (
        <>
            <Head>
                <title>Registro - Onion RSV 360</title>
                <meta name="description" content="Crie sua conta no sistema Onion RSV 360" />
            </Head>
            
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="container mx-auto p-4 max-w-sm">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Onion RSV 360
                        </h1>
                        <p className="text-gray-600">
                            Crie sua conta gratuitamente
                        </p>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
                        <div className="mb-4">
                            <label htmlFor="fullName" className="block text-gray-700 mb-2 font-medium">
                                Nome Completo
                            </label>
                            <input
                                id="fullName"
                                name="fullName"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                                autoComplete="name"
                                aria-describedby="fullName-error"
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="email" className="block text-gray-700 mb-2 font-medium">
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                                autoComplete="email"
                                aria-describedby="email-error"
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="password" className="block text-gray-700 mb-2 font-medium">
                                Senha
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                                autoComplete="new-password"
                                aria-describedby="password-error"
                            />
                        </div>
                        {error && (
                            <div id="register-error" className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                                {error}
                            </div>
                        )}
                        <button 
                            type="submit" 
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white p-2 rounded transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                            aria-describedby="register-error"
                        >
                            Registrar
                        </button>
                        
                        <div className="mt-4 text-center">
                            <p className="text-sm text-gray-600">
                                Já tem uma conta?{' '}
                                <Link href="/login" className="text-blue-600 hover:underline font-medium">
                                    Faça login
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

