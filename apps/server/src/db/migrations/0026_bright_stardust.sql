-- Elimina la fuente de tasa 'intervencion'.
--
-- Radar dejó de publicarla y la última quedó congelada el 13/08/2026. Una tasa
-- que no se actualiza es peor que no tenerla, así que se borra el histórico y
-- se saca el valor del tipo enumerado.
--
-- El DELETE va PRIMERO y es imprescindible: el ALTER ... USING de abajo falla
-- si queda alguna fila con un valor que el tipo nuevo ya no contiene.
DELETE FROM "exchange_rates" WHERE "source" = 'intervencion';--> statement-breakpoint
ALTER TABLE "exchange_rates" ALTER COLUMN "source" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."exchange_rate_source";--> statement-breakpoint
CREATE TYPE "public"."exchange_rate_source" AS ENUM('bcv', 'euro', 'usdt');--> statement-breakpoint
ALTER TABLE "exchange_rates" ALTER COLUMN "source" SET DATA TYPE "public"."exchange_rate_source" USING "source"::"public"."exchange_rate_source";
