import { useState, useEffect } from 'react';
import { fetchUserProfile, updateUserProfile, type UserProfileData } from '../services/api';

interface UserProfileProps {
    onClose?: () => void;
    onSave?: () => void;
}

const UserProfile = ({ onClose, onSave }: UserProfileProps) => {
    const [profile, setProfile] = useState<UserProfileData>({
        email: null,
        phone: null,
        linkedin: null,
        company: null,
        position: null,
        notes: null,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetchUserProfile();
            setProfile(response.profile);
        } catch (err) {
            setError('Error al cargar el perfil');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (field: keyof UserProfileData, value: string) => {
        setProfile(prev => ({
            ...prev,
            [field]: value || null
        }));
        setSuccessMessage(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await updateUserProfile(profile);
            setProfile(response.profile);
            setSuccessMessage('Perfil guardado exitosamente');
            onSave?.();
        } catch (err) {
            setError('Error al guardar el perfil');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="user-profile-card">
                <div className="user-profile-header">
                    <h3>👤 Mi Perfil</h3>
                </div>
                <div className="user-profile-content">
                    <div className="user-profile-loading">Cargando...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="user-profile-card">
            <div className="user-profile-header">
                <h3>👤 Mi Perfil</h3>
            </div>
            <div className="user-profile-content">
                {error && (
                    <div className="user-profile-error">
                        {error}
                        <button onClick={loadProfile} className="retry-btn">Reintentar</button>
                    </div>
                )}

                {successMessage && (
                    <div className="user-profile-success">
                        ✓ {successMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="user-profile-form">
                    <div className="form-group">
                        <label htmlFor="email" className="form-label">
                            Email <span className="required">*</span>
                        </label>
                        <input
                            type="email"
                            id="email"
                            className="form-input"
                            placeholder="tu@email.com"
                            value={profile.email || ''}
                            onChange={(e) => handleChange('email', e.target.value)}
                            required
                        />
                        <span className="form-hint">Requerido para hacer reservas</span>
                    </div>

                    <div className="form-group">
                        <label htmlFor="phone" className="form-label">Teléfono</label>
                        <input
                            type="tel"
                            id="phone"
                            className="form-input"
                            placeholder="+598 99 123 456"
                            value={profile.phone || ''}
                            onChange={(e) => handleChange('phone', e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="linkedin" className="form-label">LinkedIn</label>
                        <input
                            type="url"
                            id="linkedin"
                            className="form-input"
                            placeholder="https://linkedin.com/in/tu-perfil"
                            value={profile.linkedin || ''}
                            onChange={(e) => handleChange('linkedin', e.target.value)}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="company" className="form-label">Empresa</label>
                            <input
                                type="text"
                                id="company"
                                className="form-input"
                                placeholder="Nombre de tu empresa"
                                value={profile.company || ''}
                                onChange={(e) => handleChange('company', e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="position" className="form-label">Cargo</label>
                            <input
                                type="text"
                                id="position"
                                className="form-input"
                                placeholder="Tu cargo"
                                value={profile.position || ''}
                                onChange={(e) => handleChange('position', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="notes" className="form-label">Notas adicionales</label>
                        <textarea
                            id="notes"
                            className="form-textarea"
                            placeholder="Información adicional que quieras compartir..."
                            rows={3}
                            value={profile.notes || ''}
                            onChange={(e) => handleChange('notes', e.target.value)}
                        />
                    </div>

                    <div className="form-actions">
                        {onClose && (
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={onClose}
                            >
                                Cancelar
                            </button>
                        )}
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={isSaving}
                        >
                            {isSaving ? 'Guardando...' : 'Guardar perfil'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserProfile;
