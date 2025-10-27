# Code Quality Evaluation Skill - Package Complete ✅

Votre skill Claude Code pour l'évaluation de la qualité et maintenabilité du code est maintenant prête !

## 📦 Contenu du Package

```
code-quality-evaluation/
├── SKILL.md                    # Skill principale (Claude Code la lit automatiquement)
├── README.md                   # Documentation d'installation et d'utilisation
├── examples.md                 # Exemples concrets avant/après
├── quick-reference.md          # Guide de référence rapide (1 page)
├── check-quality.sh           # Script d'analyse automatique
├── install-skill.sh           # Script d'installation
├── .clinerules-example        # Exemple de règles pour projets
└── PACKAGE-INFO.md            # Ce fichier
```

## 🚀 Installation

### Option 1 : Installation Automatique (Recommandée)

```bash
cd claude-skills/code-quality-evaluation
chmod +x install-skill.sh
./install-skill.sh
```

Le script vous guidera pour choisir :
- Installation personnelle (`~/.claude/skills/`) - disponible dans tous vos projets
- Installation projet (`.claude/skills/`) - partagée avec votre équipe
- Les deux

### Option 2 : Installation Manuelle

**Pour usage personnel :**
```bash
mkdir -p ~/.claude/skills
cp -r code-quality-evaluation ~/.claude/skills/
chmod +x ~/.claude/skills/code-quality-evaluation/check-quality.sh
```

**Pour un projet (Mail Quest) :**
```bash
cd /path/to/mail-quest
mkdir -p .claude/skills
cp -r /path/to/code-quality-evaluation .claude/skills/
chmod +x .claude/skills/code-quality-evaluation/check-quality.sh
git add .claude/skills/code-quality-evaluation
git commit -m "Add code quality evaluation skill"
```

## 🎯 Utilisation

### Avec Claude Code

La skill s'active automatiquement quand vous demandez :

```
"Évalue la maintenabilité du code que je viens de générer"

"Review the code quality of the reputation calculator"

"Check if this code follows best practices"

"Is this module well-structured?"
```

### Script d'Analyse Automatique

```bash
# Dans votre projet Mail Quest
cd /path/to/mail-quest

# Lancer l'analyse
~/.claude/skills/code-quality-evaluation/check-quality.sh

# Ou sauvegarder le rapport
~/.claude/skills/code-quality-evaluation/check-quality.sh quality-report.txt
```

### Intégration Continue

Copiez `.clinerules-example` dans votre projet :

```bash
cd /path/to/mail-quest
cp .claude/skills/code-quality-evaluation/.clinerules-example .clinerules

# Claude Code appliquera automatiquement ces règles lors de la génération
```

## 📚 Documentation

### Lecture Recommandée (dans l'ordre)

1. **quick-reference.md** (5 min) - Vue d'ensemble rapide
2. **README.md** (10 min) - Installation et usage complet
3. **SKILL.md** (20 min) - Guide complet d'évaluation
4. **examples.md** (15 min) - Exemples concrets de refactoring

### Structure du SKILL.md

Le fichier principal contient :
- **4 Piliers d'évaluation** : Architecture, Modularité, DRY, Tests
- **Matrice de décision rapide** : 🔴 🟡 🟢
- **Stratégies de refactoring** : Comment corriger les problèmes
- **Checklist finale** : Avant de merger du code
- **Script de monitoring** : Suivi continu de la qualité

## 🎓 Concepts Clés

### Les 4 Piliers

1. **🏗️ Architecture & Structure**
   - Taille des fichiers (< 250 lignes)
   - Profondeur des répertoires (≤ 3 niveaux)
   - Séparation des responsabilités

2. **🔄 Modularité & Couplage**
   - Composants réutilisables
   - Imports propres
   - Séparation UI/Logique

3. **🎯 DRY (Don't Repeat Yourself)**
   - Duplication < 5%
   - Utilitaires partagés
   - Constantes centralisées

4. **✅ Qualité des Tests**
   - Couverture > 80%
   - Tests paramétrés
   - Focus sur le comportement

### Système de Décision

```
Majorité 🟢 → Merge immédiat
Majorité 🟡 → Refactoring 1-2h puis merge
Majorité 🔴 → Refactoring obligatoire avant merge
```

## 🔧 Commandes Utiles

```bash
# Vérifier les fichiers trop gros
find src -name "*.js" -o -name "*.svelte" | xargs wc -l | sort -rn | head -10

# Détecter la duplication
npx jscpd src/ --threshold 10

# Trouver les imports profonds
grep -r "from '\.\./\.\./\.\." src/

# Couverture des tests
npm run test -- --coverage

# Analyse complète
./check-quality.sh
```

## 📊 Métriques Cibles

| Métrique | Cible |
|----------|-------|
| Taille fichier | < 250 lignes |
| Profondeur répertoire | ≤ 3 niveaux |
| Duplication | < 5% |
| Imports profonds | 0 |
| Composants réutilisables | > 70% |
| Couverture tests | > 80% |

## 💡 Cas d'Usage Mail Quest

### Exemple 1 : Après génération d'un module

```
Je viens de générer le module reputation-calculator.js.
Peux-tu évaluer sa maintenabilité selon la skill code-quality-evaluation ?
```

Claude analysera :
- Taille du fichier
- Duplication de code
- Couplage avec d'autres modules
- Couverture des tests
- Recommandations spécifiques

### Exemple 2 : Avant de merger une PR

```
Review the ESP dashboard feature branch using the code quality skill
before I merge to main.
```

Claude vérifiera :
- Tous les fichiers modifiés
- Duplication introduite
- Séparation des responsabilités
- Suggestions de refactoring

### Exemple 3 : Refactoring guidé

```
Le fichier game-engine.js fait 800 lignes.
Comment le découper selon les best practices de la skill ?
```

Claude proposera :
- Analyse des responsabilités
- Limites logiques des modules
- Stratégie de refactoring
- Structure avant/après

## 🎯 Workflow Recommandé

### 1. Avant la Génération

Définissez les contraintes :
```
Generate the client manager module with these constraints:
- Maximum 250 lines
- No code duplication
- Testable without UI coupling
- Use dependency injection
```

### 2. Après la Génération

Évaluez immédiatement :
```
Evaluate the code quality of what you just generated using the
code-quality-evaluation skill.
```

### 3. Avant le Merge

Vérification finale :
```bash
# Lancer l'analyse automatique
./check-quality.sh quality-report.txt

# Reviewer le rapport
cat quality-report.txt

# Si OK, merger
git merge feature-branch
```

### 4. Monitoring Hebdomadaire

```bash
# Chaque lundi matin
cd mail-quest
./check-quality.sh weekly-report-$(date +%Y-%m-%d).txt

# Identifier les dégradations
# Planifier le refactoring si nécessaire
```

## 🐛 Dépannage

### La skill ne s'active pas

**Vérifications :**
1. Fichier au bon endroit ?
   ```bash
   ls -la ~/.claude/skills/code-quality-evaluation/SKILL.md
   ls -la .claude/skills/code-quality-evaluation/SKILL.md
   ```

2. YAML frontmatter valide ?
   ```bash
   head -10 SKILL.md
   # Doit commencer par ---
   ```

3. Trigger explicite :
   ```
   Use the code-quality-evaluation skill to review this code
   ```

### Le script ne s'exécute pas

```bash
# Rendre exécutable
chmod +x check-quality.sh

# Vérifier les dépendances
which npx  # Doit retourner un chemin
npm --version  # Doit afficher une version
```

### jscpd introuvable

```bash
# Installation globale
npm install -g jscpd

# Ou utilisation via npx
npx jscpd src/
```

## 🚀 Prochaines Étapes

1. **Installer la skill** (5 min)
   ```bash
   ./install-skill.sh
   ```

2. **Tester sur Mail Quest** (10 min)
   ```bash
   cd /path/to/mail-quest
   ~/.claude/skills/code-quality-evaluation/check-quality.sh
   ```

3. **L'utiliser avec Claude Code** (15 min)
   - Générer un module
   - Demander l'évaluation
   - Appliquer les recommandations

4. **Intégrer dans le workflow** (30 min)
   - Copier `.clinerules-example` vers `.clinerules`
   - Ajouter `check-quality.sh` au CI/CD
   - Former l'équipe

## 📞 Support

- **Documentation** : Voir README.md, SKILL.md, examples.md
- **Claude Code docs** : https://docs.claude.com/en/docs/claude-code
- **Agent Skills guide** : https://docs.claude.com/en/docs/agents-and-tools/agent-skills

## 📝 Notes de Version

**Version 1.0.0** (2025-01-27)
- ✅ Skill complète avec 4 piliers d'évaluation
- ✅ Matrice de décision rapide
- ✅ Script d'analyse automatique
- ✅ Exemples concrets avant/après
- ✅ Guide de référence rapide
- ✅ Installation automatisée

## 🎉 Conclusion

Vous avez maintenant une skill professionnelle pour :
- ✅ Évaluer la maintenabilité du code généré
- ✅ Identifier les problèmes de structure
- ✅ Guider le refactoring
- ✅ Maintenir une haute qualité de code

**Objectif** : Du code facile à modifier en toute sécurité, même 6 mois plus tard !

---

**Bon développement avec Mail Quest ! 🚀**