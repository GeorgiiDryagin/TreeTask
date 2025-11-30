
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { TreeTaskLogo } from './TreeTaskLogo';

export const AuthView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
        if (mode === 'signup') {
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });
            if (error) throw error;
            setMessage({ text: 'Registration successful! Check your email to confirm.', type: 'success' });
        } else {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
        }
    } catch (error: any) {
        setMessage({ text: error.message || 'An error occurred', type: 'error' });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
        
        <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 shadow-lg rounded-2xl overflow-hidden mb-4">
                <TreeTaskLogo className="w-full h-full" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">TreeTask</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-center">
                Your hierarchical brain in the cloud.
            </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="you@example.com"
                />
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                <input 
                    type="password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="••••••••"
                />
            </div>

            {message && (
                <div className={`p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400'}`}>
                    {message.text}
                </div>
            )}

            <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-colors disabled:opacity-50 flex justify-center items-center"
            >
                {loading ? <i className="fas fa-circle-notch fa-spin"></i> : (mode === 'signin' ? 'Sign In' : 'Sign Up')}
            </button>
        </form>

        <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
                {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
                <button 
                    onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(null); }}
                    className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                >
                    {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                </button>
            </p>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center text-xs text-gray-400">
            <p>Syncs across devices • Offline support • Secure</p>
        </div>
      </div>
    </div>
  );
};
