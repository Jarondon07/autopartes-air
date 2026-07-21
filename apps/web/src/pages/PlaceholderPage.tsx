import { Card, Empty, Typography } from 'antd';

const { Title } = Typography;

interface Props {
  title: string;
}

/** Página genérica para módulos aún no implementados (Fase 2). */
export function PlaceholderPage({ title }: Props) {
  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        {title}
      </Title>
      <Card>
        <Empty description={`Módulo "${title}" en construcción — Fase 2`} />
      </Card>
    </div>
  );
}
