import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  CreateExchangeRateInput,
  ExchangeRateSource,
} from '@autopartes-air/shared';
import * as ratesApi from '../api/exchangeRates.api';

const KEY = 'exchange-rates';

export function useCurrentRates() {
  return useQuery({
    queryKey: [KEY, 'current'],
    queryFn: ratesApi.getCurrentRates,
  });
}

export function useRates(params: {
  page?: number;
  limit?: number;
  source?: ExchangeRateSource;
}) {
  return useQuery({
    queryKey: [KEY, 'list', params],
    queryFn: () => ratesApi.listRates(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExchangeRateInput) => ratesApi.createRate(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
