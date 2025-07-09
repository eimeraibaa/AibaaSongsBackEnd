import {User} from '../models/users.js'

export const loginUser = async (req, res) => {
  const { email , password } = req.body;
  const getUser = await User.findOne({
    where: {
      email: email,
      password: password
    }
  })
    if (!getUser) {
        return res.status(404).json({ message: "Usuario no registrado" });
    }
    res.status(200).json(getUser);
    res.json(getUser)
  res.status(500).json({ message: "Internal server error" });
};

export const createUser = async (req, res) => {
  const { firstName, lastName, email, password , confirmPassword } = req.body;
  
  const newUser  = await User.create({
    firstName,
    lastName,
    email,
    password,
    confirmPassword
  })

  console.log(req.body);
  
  res.json(newUser);
}

// const updateUser = (req, res) => {
//   const userId = req.params.id;
//   const { name, lastname, email, password } = req.body;
  
//   // Simulate updating user
//   const updatedUser = { id: userId, name, lastname, email, password };
  
//   res.status(200).json(updatedUser);
// }

// const deleteUser = (req, res) => {
//   const userId = req.params.id;
  
//   // Simulate deleting user
//   res.status(204).send(); // No content to return
// }