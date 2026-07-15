import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import AppLayout from '../components/AppLayout';
import './AdminUsersPage.css';

interface Permission {
  id: string;
  code: string;
  label: string;
  description?: string | null;
}

interface Role {
  id: string;
  name: string;
  permissionCodes: string[];
}

interface User {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  roles: string[];
  roleIds: string[];
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  useEffect(() => {
    loadUsers();
    loadRolesAndPermissions();
    // Abrir modal de criação se vier com ?action=create
    if (searchParams.get('action') === 'create') {
      setShowCreateModal(true);
      setSearchParams({}, { replace: true }); // limpar o param da URL
    }
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users');
      setUsers(res.data?.data || res.data || []);
    } catch {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const loadRolesAndPermissions = async () => {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/admin/roles'),
        api.get('/admin/permissions'),
      ]);
      setRoles(rolesRes.data?.data || rolesRes.data || []);
      setPermissions(permsRes.data?.data || permsRes.data || []);
    } catch {
      toast.error('Erro ao carregar cargos/permissões');
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await api.patch(`/admin/users/${user.id}/toggle-active`);
      toast.success(`Usuário ${user.isActive ? 'desativado' : 'ativado'} com sucesso`);
      loadUsers();
    } catch {
      toast.error('Erro ao alterar status do usuário');
    }
  };

  const getRoleBadgeClass = (role: string) => {
    const map: Record<string, string> = {
      ADMIN: 'badge-admin',
      OPERATOR: 'badge-operator',
      ATTENDANT: 'badge-attendant',
      PSYCHOLOGIST: 'badge-psychologist',
      SECURITY: 'badge-security',
      GUARD: 'badge-guard',
    };
    return map[role] || 'badge-default';
  };

  const getRoleLabel = (role: string) => role;

  return (
    <AppLayout>
      <div className="admin-users-page">
        <div className="admin-users-header">
          <div>
            <h1>Administração</h1>
            <p>{users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn-create"
              onClick={() => { setActiveTab('roles'); setShowCreateRoleModal(true); }}
            >
              + Criar Cargo
            </button>
            <button className="btn-create" onClick={() => { setActiveTab('users'); setShowCreateModal(true); }}>
              + Criar Conta
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            className={`tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
            type="button"
          >
            Usuários
          </button>
          <button
            className={`tab ${activeTab === 'roles' ? 'active' : ''}`}
            onClick={() => setActiveTab('roles')}
            type="button"
          >
            Cargos
          </button>
        </div>

        {loading ? (
          <div className="admin-loading">Carregando usuários...</div>
        ) : activeTab === 'roles' ? (
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Cargo</th>
                  <th>Permissões</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r) => (
                  <tr key={r.id}>
                    <td className="td-name">{r.name}</td>
                    <td className="td-roles">
                      {r.permissionCodes?.length ? (
                        r.permissionCodes.map((code) => (
                          <span key={code} className="role-badge badge-default">
                            {code}
                          </span>
                        ))
                      ) : (
                        <span style={{ opacity: 0.7 }}>Sem permissões</span>
                      )}
                    </td>
                    <td className="td-actions">
                      <button className="btn-edit" onClick={() => setEditingRole(r)} title="Editar cargo">
                        ✏️ Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email / Telefone</th>
                  <th>Perfis de Acesso</th>
                  <th>Status</th>
                  <th>Criado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className={!user.isActive ? 'row-inactive' : ''}>
                    <td className="td-name">{user.name}</td>
                    <td className="td-contact">
                      {user.email && <span>{user.email}</span>}
                      {user.phone && <span className="phone">{user.phone}</span>}
                    </td>
                    <td className="td-roles">
                      {user.roles.map((r) => (
                        <span key={r} className={`role-badge ${getRoleBadgeClass(r)}`}>
                          {getRoleLabel(r)}
                        </span>
                      ))}
                    </td>
                    <td>
                      <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                        {user.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td className="td-actions">
                      <button
                        className="btn-edit"
                        onClick={() => setEditingUser(user)}
                        title="Editar perfis"
                      >
                        ✏️ Cargos
                      </button>
                      <button
                        className={`btn-toggle ${user.isActive ? 'btn-deactivate' : 'btn-activate'}`}
                        onClick={() => handleToggleActive(user)}
                        title={user.isActive ? 'Desativar' : 'Ativar'}
                      >
                        {user.isActive ? '🔒 Desativar' : '🔓 Ativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showCreateModal && (
          <CreateUserModal
            onClose={() => setShowCreateModal(false)}
            roles={roles}
            onSuccess={() => { setShowCreateModal(false); loadUsers(); }}
          />
        )}

        {editingUser && (
          <EditRolesModal
            user={editingUser}
            onClose={() => setEditingUser(null)}
            roles={roles}
            onSuccess={() => { setEditingUser(null); loadUsers(); }}
          />
        )}

        {showCreateRoleModal && (
          <CreateRoleModal
            onClose={() => setShowCreateRoleModal(false)}
            permissions={permissions}
            onSuccess={() => { setShowCreateRoleModal(false); loadRolesAndPermissions(); }}
          />
        )}

        {editingRole && (
          <EditRoleModal
            role={editingRole}
            onClose={() => setEditingRole(null)}
            permissions={permissions}
            onSuccess={() => { setEditingRole(null); loadRolesAndPermissions(); }}
          />
        )}
      </div>
    </AppLayout>
  );
}

// ── Modal: Criar Usuário ──────────────────────────────────────────────────────

function CreateUserModal({
  onClose,
  onSuccess,
  roles,
}: {
  onClose: () => void;
  onSuccess: () => void;
  roles: Role[];
}) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
  });
  const defaultRoleId = roles.find((r) => r.name === 'OPERATOR')?.id || roles[0]?.id;
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(defaultRoleId ? [defaultRoleId] : []);
  const [saving, setSaving] = useState(false);

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (selectedRoleIds.length === 0) {
      toast.error('Selecione pelo menos um cargo');
      return;
    }
    try {
      setSaving(true);
      await api.post('/admin/users', {
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        password: form.password,
        roleIds: selectedRoleIds,
      });
      toast.success('Usuário criado com sucesso!');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao criar usuário');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Criar Nova Conta</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Nome completo *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome do usuário"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="form-group">
              <label>Telefone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+5511999999999"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Senha *</label>
              <input
                required
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label>Confirmar senha *</label>
              <input
                required
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="Repita a senha"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Cargos *</label>
            <div className="roles-grid">
              {roles.map((role) => (
                <label key={role.id} className={`role-option ${selectedRoleIds.includes(role.id) ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selectedRoleIds.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                  />
                  <div>
                    <strong>{role.name}</strong>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? 'Criando...' : 'Criar Conta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal: Editar Roles ───────────────────────────────────────────────────────

function EditRolesModal({ user, onClose, onSuccess, roles }: {
  user: User; onClose: () => void; onSuccess: () => void; roles: Role[];
}) {
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(user.roleIds || []);
  const [saving, setSaving] = useState(false);

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRoleIds.length === 0) {
      toast.error('Selecione pelo menos um cargo');
      return;
    }
    try {
      setSaving(true);
      await api.patch(`/admin/users/${user.id}/roles`, { roleIds: selectedRoleIds });
      toast.success('Cargos atualizados com sucesso!');
      onSuccess();
    } catch {
      toast.error('Erro ao atualizar cargos');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Editar Cargos — {user.name}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Cargos</label>
            <div className="roles-grid">
              {roles.map((role) => (
                <label key={role.id} className={`role-option ${selectedRoleIds.includes(role.id) ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selectedRoleIds.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                  />
                  <div>
                    <strong>{role.name}</strong>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Cargos'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateRoleModal({
  onClose,
  onSuccess,
  permissions,
}: {
  onClose: () => void;
  onSuccess: () => void;
  permissions: Permission[];
}) {
  const [name, setName] = useState('');
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggle = (code: string) => {
    setSelectedCodes((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Informe o nome do cargo');
      return;
    }
    try {
      setSaving(true);
      await api.post('/admin/roles', { name: name.trim(), permissionCodes: selectedCodes });
      toast.success('Cargo criado com sucesso!');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao criar cargo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Criar Cargo</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Nome *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Guarda" />
          </div>
          <div className="form-group">
            <label>Permissões</label>
            <div className="roles-grid">
              {permissions.map((p) => (
                <label key={p.code} className={`role-option ${selectedCodes.includes(p.code) ? 'selected' : ''}`}>
                  <input type="checkbox" checked={selectedCodes.includes(p.code)} onChange={() => toggle(p.code)} />
                  <div>
                    <strong>{p.label}</strong>
                    <span>{p.code}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? 'Criando...' : 'Criar Cargo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditRoleModal({
  role,
  onClose,
  onSuccess,
  permissions,
}: {
  role: Role;
  onClose: () => void;
  onSuccess: () => void;
  permissions: Permission[];
}) {
  const [name, setName] = useState(role.name);
  const [selectedCodes, setSelectedCodes] = useState<string[]>(role.permissionCodes || []);
  const [saving, setSaving] = useState(false);

  const toggle = (code: string) => {
    setSelectedCodes((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Informe o nome do cargo');
      return;
    }
    try {
      setSaving(true);
      await api.patch(`/admin/roles/${role.id}`, { name: name.trim(), permissionCodes: selectedCodes });
      toast.success('Cargo atualizado com sucesso!');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao atualizar cargo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Editar Cargo — {role.name}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Nome *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Permissões</label>
            <div className="roles-grid">
              {permissions.map((p) => (
                <label key={p.code} className={`role-option ${selectedCodes.includes(p.code) ? 'selected' : ''}`}>
                  <input type="checkbox" checked={selectedCodes.includes(p.code)} onChange={() => toggle(p.code)} />
                  <div>
                    <strong>{p.label}</strong>
                    <span>{p.code}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Cargo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
