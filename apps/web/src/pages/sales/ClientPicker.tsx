import { useEffect, useState } from 'react';
import { CloseOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Input, Select, Space, Tag, Typography } from 'antd';
import type { Client, DocumentType } from '@autopartes-air/shared';
import { DOCUMENT_TYPES } from '@autopartes-air/shared';
import { useClients } from '../../hooks/useClients';
import { ClientFormModal } from '../clients/ClientFormModal';

const { Text } = Typography;

interface Props {
  value?: number;
  onChange: (id: number | undefined, client?: Client) => void;
}

/**
 * Selector de cliente para el cajero: busca por tipo de documento + cédula/RIF;
 * si existe lo usa, si no abre el formulario completo (modal) para crearlo.
 * Vacío = contado (sin cliente).
 */
export function ClientPicker({ value, onChange }: Props) {
  const [docType, setDocType] = useState<DocumentType>('V');
  const [docNumber, setDocNumber] = useState('');
  const [selected, setSelected] = useState<Client | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const q = docNumber.trim();
  const clients = useClients({ q: q || undefined, limit: 5 });

  // Si el padre limpia el cliente (ej. tras cobrar), reinicia el picker.
  useEffect(() => {
    if (value == null) {
      setSelected(null);
      setDocNumber('');
    }
  }, [value]);

  const match = (clients.data?.data ?? []).find(
    (c) => c.documentType === docType && c.documentNumber === q,
  );

  const pick = (client: Client) => {
    setSelected(client);
    onChange(client.id, client);
  };

  const clear = () => {
    setSelected(null);
    setDocNumber('');
    onChange(undefined);
  };

  if (selected) {
    return (
      <Space align="center" wrap>
        <UserOutlined />
        <Text strong>
          {selected.documentType}-{selected.documentNumber}
        </Text>
        <Text>· {selected.name}</Text>
        <Button size="small" icon={<CloseOutlined />} onClick={clear}>
          Quitar
        </Button>
      </Space>
    );
  }

  return (
    <div>
      <Space.Compact style={{ width: '100%' }}>
        <Select
          value={docType}
          onChange={setDocType}
          style={{ width: 80 }}
          options={DOCUMENT_TYPES.map((t) => ({ value: t, label: t }))}
        />
        <Input
          placeholder="Cédula / RIF (número)"
          value={docNumber}
          onChange={(e) => setDocNumber(e.target.value)}
          allowClear
        />
      </Space.Compact>

      {q !== '' && (
        <div style={{ marginTop: 8 }}>
          {clients.isFetching && !match ? (
            <Text type="secondary">Buscando…</Text>
          ) : match ? (
            <Space wrap>
              <Tag color="success">Encontrado</Tag>
              <Text>{match.name}</Text>
              <Button type="primary" size="small" onClick={() => pick(match)}>
                Usar cliente
              </Button>
            </Space>
          ) : (
            <Space wrap>
              <Text type="secondary">No existe.</Text>
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => setModalOpen(true)}
              >
                Crear cliente
              </Button>
            </Space>
          )}
        </div>
      )}

      <ClientFormModal
        open={modalOpen}
        client={null}
        initial={{ documentType: docType, documentNumber: q }}
        onCreated={(client) => pick(client)}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
