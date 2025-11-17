#!/usr/bin/env node

/**
 * Script de diagnóstico para verificar la configuración del webhook
 *
 * Uso:
 *   npm run diagnose
 *   # o
 *   node scripts/diagnose-webhook.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar .env desde la raíz del proyecto
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('\n========================================');
console.log('🔍 DIAGNÓSTICO DE CONFIGURACIÓN');
console.log('========================================\n');

const checks = [];

// 1. Verificar variables de entorno críticas
console.log('📋 Variables de Entorno:\n');

const envVars = [
  { name: 'STRIPE_SECRET_KEY', required: true, sensitive: true },
  { name: 'STRIPE_WEBHOOK_SECRET', required: true, sensitive: true },
  { name: 'SUNO_API_KEY', required: true, sensitive: true },
  { name: 'SUNO_CALLBACK_URL', required: false, sensitive: false },
  { name: 'OPENAI_API_KEY', required: true, sensitive: true },
  { name: 'DATABASE_URL', required: true, sensitive: true },
  { name: 'RESEND_API_KEY', required: false, sensitive: true },
  { name: 'EMAIL_FROM', required: false, sensitive: false },
  { name: 'FRONTEND_URL', required: true, sensitive: false },
  { name: 'BACKEND_URL', required: true, sensitive: false },
];

envVars.forEach(({ name, required, sensitive }) => {
  const value = process.env[name];
  const configured = !!value;

  let status = '❌ NO';
  let displayValue = 'NO CONFIGURADO';

  if (configured) {
    status = '✅ SÍ';
    if (sensitive && value.length > 10) {
      displayValue = `${value.substring(0, 10)}...`;
    } else if (sensitive) {
      displayValue = '***';
    } else {
      displayValue = value;
    }
  }

  const requiredText = required ? '[REQUERIDO]' : '[OPCIONAL]';
  console.log(`  ${status} ${name} ${requiredText}`);
  console.log(`      ${displayValue}\n`);

  checks.push({
    name,
    required,
    configured,
    status: configured ? 'OK' : (required ? 'ERROR' : 'WARNING')
  });
});

// 2. Verificar configuración del webhook
console.log('\n========================================');
console.log('🔗 Configuración del Webhook:\n');

const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
const webhookPath = '/webhook/stripe';
const webhookFullUrl = backendUrl + webhookPath;

console.log(`  Endpoint del webhook: ${webhookPath}`);
console.log(`  URL completa: ${webhookFullUrl}\n`);

// Verificar si es localhost (problemático en producción)
if (webhookFullUrl.includes('localhost') || webhookFullUrl.includes('127.0.0.1')) {
  console.log('  ⚠️  ADVERTENCIA: La URL usa localhost');
  console.log('      Stripe no puede alcanzar localhost en producción.');
  console.log('      Soluciones:');
  console.log('      - En desarrollo: Usa ngrok (npx ngrok http 3000)');
  console.log('      - En producción: Usa tu dominio público\n');
  checks.push({ name: 'Webhook URL', status: 'WARNING' });
} else if (!webhookFullUrl.startsWith('https://')) {
  console.log('  ⚠️  ADVERTENCIA: La URL no usa HTTPS');
  console.log('      Stripe requiere HTTPS en producción.\n');
  checks.push({ name: 'Webhook URL', status: 'WARNING' });
} else {
  console.log('  ✅ URL del webhook es válida\n');
  checks.push({ name: 'Webhook URL', status: 'OK' });
}

// 3. Verificar SUNO_CALLBACK_URL
console.log('\n========================================');
console.log('🎵 Configuración de Suno:\n');

const sunoCallbackUrl = process.env.SUNO_CALLBACK_URL;

if (!sunoCallbackUrl || sunoCallbackUrl.trim() === '') {
  console.log('  ⚠️  SUNO_CALLBACK_URL no está configurado');
  console.log('      El sistema usará polling en lugar de webhooks.');
  console.log('      Esto funciona pero es menos eficiente.\n');
  checks.push({ name: 'Suno Callback', status: 'WARNING' });
} else {
  console.log(`  ✅ SUNO_CALLBACK_URL: ${sunoCallbackUrl}`);

  if (sunoCallbackUrl.includes('localhost') || sunoCallbackUrl.includes('127.0.0.1')) {
    console.log('  ⚠️  Usa localhost - Suno no podrá alcanzarlo\n');
    checks.push({ name: 'Suno Callback', status: 'WARNING' });
  } else if (!sunoCallbackUrl.includes('/webhook/suno')) {
    console.log('  ⚠️  La URL no parece apuntar a /webhook/suno\n');
    checks.push({ name: 'Suno Callback', status: 'WARNING' });
  } else {
    console.log('  ✅ URL válida\n');
    checks.push({ name: 'Suno Callback', status: 'OK' });
  }
}

// 4. Resumen de problemas
console.log('\n========================================');
console.log('📊 RESUMEN:\n');

const errors = checks.filter(c => c.status === 'ERROR');
const warnings = checks.filter(c => c.status === 'WARNING');
const ok = checks.filter(c => c.status === 'OK');

console.log(`  ✅ OK: ${ok.length}`);
console.log(`  ⚠️  Advertencias: ${warnings.length}`);
console.log(`  ❌ Errores: ${errors.length}\n`);

if (errors.length > 0) {
  console.log('❌ ERRORES CRÍTICOS:\n');
  errors.forEach(e => {
    console.log(`  - ${e.name}`);
    if (e.required) {
      console.log(`    Esta variable es REQUERIDA para que el sistema funcione.`);
    }
  });
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  ADVERTENCIAS:\n');
  warnings.forEach(w => {
    console.log(`  - ${w.name}`);
  });
  console.log('\n  Estas advertencias no impiden el funcionamiento,');
  console.log('  pero pueden causar problemas en ciertos escenarios.\n');
}

// 5. Siguientes pasos
console.log('\n========================================');
console.log('📋 SIGUIENTES PASOS:\n');

if (errors.length === 0 && warnings.length === 0) {
  console.log('  ✅ ¡Todo está configurado correctamente!\n');
  console.log('  Próximos pasos:');
  console.log('  1. Configura el webhook en Stripe Dashboard');
  console.log('     https://dashboard.stripe.com/test/webhooks\n');
  console.log('  2. Prueba con un pago de prueba');
  console.log('     Tarjeta: 4242 4242 4242 4242\n');
  console.log('  3. Revisa los logs del servidor para verificar');
  console.log('     que el webhook se reciba correctamente.\n');
} else {
  if (errors.length > 0) {
    console.log('  1. ❌ Corrige las variables de entorno REQUERIDAS');
    console.log('     - Copia .env.example a .env');
    console.log('     - Llena todas las variables marcadas como [REQUERIDO]\n');
  }

  if (warnings.filter(w => w.name === 'Webhook URL').length > 0) {
    console.log('  2. ⚠️  Configura una URL pública para el webhook');
    console.log('     - En desarrollo: npx ngrok http 3000');
    console.log('     - Copia la URL de ngrok a BACKEND_URL en .env\n');
  }

  console.log('  3. 📖 Lee la guía completa:');
  console.log('     cat CONFIGURACION_WEBHOOK_STRIPE.md\n');
}

console.log('========================================\n');

// Salir con código de error si hay errores críticos
if (errors.length > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
