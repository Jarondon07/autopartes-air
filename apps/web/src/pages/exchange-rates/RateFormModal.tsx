import { App, DatePicker, Form, Modal, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import {
  EXCHANGE_RATE_SOURCES,
  EXCHANGE_RATE_SOURCE_LABELS,
} from '@autopartes-air/shared';
import { getApiErrorMessage } from '../../api/client';
import { RateInput } from '../../components/NumberInputs';
import { useCreateRate } from '../../hooks/useExchangeRates';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface FormValues {
  rateDate: Dayjs;
  source: (typeof EXCHANGE_RATE_SOURCES)[number];
  rateBsPerUsd: number;
}

export function RateFormModal({ open, onClose }: Props) {
  const [form] = Form.useForm<FormValues>();
  const { message } = App.useApp();
  const createRate = useCreateRate();

  const handleOk = async () => {
    const values = await form.validateFields();
    try {
      await createRate.mutateAsync({
        rateDate: values.rateDate.format('YYYY-MM-DD'),
        source: values.source,
        rateBsPerUsd: values.rateBsPerUsd,
      });
      message.success('Tasa registrada');
      form.resetFields();
      onClose();
    } catch (err) {
      message.error(getApiErrorMessage(err, 'No se pudo registrar la tasa'));
    }
  };

  return (
    <Modal
      open={open}
      title="Registrar tasa de cambio"
      onCancel={onClose}
      onOk={handleOk}
      okText="Registrar"
      cancelText="Cancelar"
      confirmLoading={createRate.isPending}
      destroyOnClose
      maskClosable={false}
      afterOpenChange={(o) => {
        if (o) form.setFieldsValue({ rateDate: dayjs(), source: 'bcv' });
      }}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item
          name="rateDate"
          label="Fecha"
          rules={[{ required: true, message: 'Selecciona la fecha' }]}
        >
          <DatePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            disabledDate={(d) => d.isAfter(dayjs(), 'day')}
          />
        </Form.Item>
        <Form.Item
          name="source"
          label="Fuente"
          rules={[{ required: true, message: 'Selecciona la fuente' }]}
        >
          <Select
            options={EXCHANGE_RATE_SOURCES.map((s) => ({
              value: s,
              label: EXCHANGE_RATE_SOURCE_LABELS[s],
            }))}
          />
        </Form.Item>
        <Form.Item
          name="rateBsPerUsd"
          label="Tasa (Bs por USD)"
          rules={[{ required: true, message: 'Ingresa la tasa' }]}
        >
          <RateInput suffix="Bs/USD" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
