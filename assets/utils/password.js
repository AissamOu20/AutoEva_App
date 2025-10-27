import fs from "fs";
import bcrypt from "bcrypt";

const students = JSON.parse(fs.readFileSync("students.json", "utf8"));

async function hashPasswords() {
  for (let student of students) {
    const hashed = await bcrypt.hash(student.password, 10); // 10 = salt rounds
    student.password = hashed;
  }

  fs.writeFileSync("students_hashed.json", JSON.stringify(students, null, 2));
  console.log("Passwords hachés et fichier sauvegardé !");
}

hashPasswords();
