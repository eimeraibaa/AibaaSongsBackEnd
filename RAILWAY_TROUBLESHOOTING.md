# 🔧 Solución de Problemas - Railway PostgreSQL

## ❌ Error: ETIMEDOUT al Conectar con PostgreSQL

### Síntomas:
```
ConnectionError [SequelizeConnectionError]: connect ETIMEDOUT fd12:b3d1:6f3c:1:a000:67:5bf4:9ead:5432
```

### Causa:
Este error ocurre cuando Railway intenta conectarse a PostgreSQL usando una dirección IPv6 que causa timeout.

### ✅ Solución Aplicada:

He actualizado el archivo `src/database/database.js` con las siguientes mejoras:

1. **`native: false`**: Desactiva los bindings nativos para evitar problemas de compatibilidad
2. **`family: 4`**: Fuerza el uso de IPv4 en lugar de IPv6
3. **Timeouts configurados**: Establece límites de tiempo de conexión adecuados
4. **Pool de conexiones**: Configura el pool para mejor manejo de conexiones

### Configuración de Pool:
```javascript
pool: {
  max: 5,          // Máximo 5 conexiones simultáneas
  min: 0,          // Mínimo 0 (cierra conexiones cuando no se usan)
  acquire: 30000,  // 30 segundos máximo para adquirir conexión
  idle: 10000,     // 10 segundos antes de cerrar conexión inactiva
}
```

---

## 🔍 Verificaciones Adicionales en Railway

### 1. Verificar que PostgreSQL esté corriendo:

En Railway Dashboard:
- Ve a tu proyecto
- Verifica que el servicio de PostgreSQL esté activo (verde)
- No debe mostrar errores en los logs

### 2. Verificar las Variables de Entorno:

Asegúrate de que `DATABASE_URL` esté configurada correctamente:

**Opción A: Usar referencia de Railway (Recomendado)**
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

**Opción B: Usar la URL completa**
```
DATABASE_URL=postgresql://usuario:password@host:5432/railway
```

### 3. Verificar que ambos servicios estén en la misma red:

- El backend y PostgreSQL deben estar en el **mismo proyecto de Railway**
- Railway automáticamente crea una red privada entre servicios del mismo proyecto
- Si están en proyectos diferentes, no podrán comunicarse

### 4. Verificar el formato de DATABASE_URL:

Railway proporciona la URL en este formato:
```
postgresql://postgres:password@hostname.railway.internal:5432/railway
```

**NO** uses la URL pública de PostgreSQL (ej: con proxy.rlwy.net), usa la URL interna.

---

## 🚀 Después de Aplicar la Solución

### Pasos para Desplegar el Fix:

1. **Hacer commit de los cambios:**
```bash
git add src/database/database.js
git commit -m "fix: Configure PostgreSQL for Railway IPv4 connectivity"
git push origin main
```

2. **Railway redesplegará automáticamente** cuando detecte el push.

3. **Verificar en los logs** que ahora se conecte correctamente:
```
✓ Base de datos conectada y sincronizada
✓ Server running on http://localhost:3000
```

---

## 🔄 Soluciones Alternativas

### Si el problema persiste:

#### Solución 1: Usar DATABASE_PRIVATE_URL

Railway proporciona una URL privada que puede funcionar mejor:

```
DATABASE_URL=${{Postgres.DATABASE_PRIVATE_URL}}
```

#### Solución 2: Deshabilitar SSL temporalmente (solo para testing)

**⚠️ NO recomendado para producción:**

```javascript
dialectOptions: {
  ssl: false,  // Solo para testing
  family: 4,
}
```

#### Solución 3: Usar URL de conexión alternativa

En Railway Variables, prueba usando partes separadas:

```
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_NAME=${{Postgres.PGDATABASE}}
```

Y modifica el código para construir la conexión:

```javascript
new Sequelize({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  dialect: 'postgres',
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false },
    family: 4,
  },
})
```

---

## 📊 Verificar la Conexión

### Desde los Logs de Railway:

1. Ve a tu servicio de backend
2. Click en la pestaña "Logs"
3. Busca estos mensajes:

**✅ Conexión Exitosa:**
```
Base de datos conectada y sincronizada
Server running on http://localhost:3000
```

**❌ Conexión Fallida:**
```
Unable to connect to the database: ConnectionError
ETIMEDOUT
```

### Test Manual desde Railway:

Puedes usar la terminal de Railway para verificar:

1. En Railway, abre el servicio de backend
2. Usa la opción "Shell" o agrega un script de prueba

---

## 🐛 Otros Errores Comunes

### Error: "password authentication failed"

**Solución:**
- Verifica que `DATABASE_URL` esté correctamente copiada
- Asegúrate de no tener espacios adicionales
- Regenera la base de datos si es necesario

### Error: "database does not exist"

**Solución:**
- Railway crea automáticamente la base de datos
- Asegúrate de usar `${{Postgres.DATABASE_URL}}`
- Verifica que el servicio de PostgreSQL esté activo

### Error: "too many connections"

**Solución:**
- Railway Free Tier limita las conexiones
- Reduce el `pool.max` en la configuración a 3:
```javascript
pool: {
  max: 3,  // Reduce de 5 a 3
  min: 0,
  acquire: 30000,
  idle: 10000,
}
```

---

## 📞 Soporte Adicional

Si después de aplicar todas las soluciones el problema persiste:

1. **Revisa Railway Status**: https://railway.app/status
2. **Revisa los logs de PostgreSQL** en Railway
3. **Contacta soporte de Railway**: https://railway.app/help
4. **Revisa Railway Discord**: https://discord.gg/railway

---

## ✅ Checklist Final

- [ ] Archivo `database.js` actualizado con `family: 4`
- [ ] Cambios commiteados y pusheados
- [ ] Railway redesplegó automáticamente
- [ ] Logs muestran "Base de datos conectada y sincronizada"
- [ ] Backend responde correctamente en la URL pública
- [ ] Endpoints funcionan correctamente (login, registro, etc.)

¡Tu backend debería estar funcionando ahora! 🎉
