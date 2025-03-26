const express = require('express');
const sql = require('mssql');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');

require('dotenv').config();

const app = express();
const port = 3000;

// Middleware para manejar CORS y datos JSON.
app.use(cors());
app.use(express.json()); // Para parsear cuerpos de solicitudes en formato JSON.
app.use(express.static(path.join(__dirname, 'public'))); // Sirve archivos estáticos

// Configuración de conexión a la base de datos.
const dbConfig = {
  user: 'root',
  password: 'root',
  server: '192.168.6.166',
  database: 'BIBLIOTECA',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

// Ruta para obtener datos de la tabla LIBRO.
app.get("/get-data", async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query("SELECT * FROM LIBRO");
    res.json(result.recordset);
  } catch (error) {
    console.error("Error al conectar a la base de datos:", error);
    res.status(500).send("Error al conectar a la base de datos");
  }
});

// Ruta para insertar datos en la tabla LIBRO.
app.post("/add-book", async (req, res) => {
  const { Titulo, Autor, Fecha, ISBN } = req.body; // Datos enviados desde el cliente.
  try {
    const pool = await sql.connect(dbConfig);

    // Consulta SQL para insertar un nuevo registro.
    await pool
      .request()
      .input("Titulo", sql.VarChar, Titulo)
      .input("Autor", sql.VarChar, Autor)
      .input("Fecha", sql.Date, Fecha)
      .input("ISBN", sql.VarChar, ISBN)
      .query(
        "INSERT INTO LIBRO (Titulo, Autor, Fecha, ISBN) VALUES (@Titulo, @Autor, @Fecha, @ISBN)"
      );

    res.send("Libro agregado exitosamente.");
  } catch (error) {
    console.error("Error al insertar en la base de datos:", error);
    res.status(500).send("Error al insertar en la base de datos");
  }
});

// Ruta para registrar un nuevo estudiante
app.post('/register', async (req, res) => {
  const { identificacion, nombre, telefono, correo, contraseña } = req.body;

  try {
    const pool = await sql.connect(dbConfig);

    // Verificar si la identificación ya existe
    const checkQuery = `SELECT * FROM Estudiantes WHERE Identificacion = @identificacion`;
    const checkResult = await pool.request()
      .input('identificacion', sql.VarChar, identificacion)
      .query(checkQuery);

    if (checkResult.recordset.length > 0) {
      return res.status(400).json({ message: 'La identificación ya está registrada.' });
    }

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(contraseña, 10);

    // Insertar el nuevo estudiante
    const insertQuery = `
      INSERT INTO Estudiantes (Identificacion, Nombre_y_Apellidos, Correo_Electronico, Numero_Telefonico, Contraseña)
      VALUES (@identificacion, @nombre, @correo, @telefono, @contraseña)
    `;
    await pool.request()
      .input('identificacion', sql.VarChar, identificacion)
      .input('nombre', sql.VarChar, nombre)
      .input('correo', sql.VarChar, correo)
      .input('telefono', sql.VarChar, telefono)
      .input('contraseña', sql.VarChar, hashedPassword)
      .query(insertQuery);

    res.status(201).json({ message: 'Estudiante registrado exitosamente.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al registrar el estudiante.' });
  }
});

// Ruta para iniciar sesión
app.post('/login', async (req, res) => {
  const { identificacion, contraseña } = req.body;

  try {
    const pool = await sql.connect(dbConfig);

    // Buscar al estudiante por identificación
    const query = `SELECT * FROM Estudiantes WHERE Identificacion = @identificacion`;
    const result = await pool.request()
      .input('identificacion', sql.VarChar, identificacion)
      .query(query);

    if (result.recordset.length === 0) {
      return res.status(400).json({ message: 'La identificación no está registrada.' });
    }

    const estudiante = result.recordset[0];

    // Verificar la contraseña
    const isPasswordValid = await bcrypt.compare(contraseña, estudiante.Contraseña);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Contraseña incorrecta.' });
    }

    res.status(200).json({ message: 'Inicio de sesión exitoso.', estudiante });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ message: 'Error al conectar con el servidor.' });
  }
});

// Inicia el servidor.
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});