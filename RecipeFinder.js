// API Configuration
const SPOONACULAR_API_KEY = '4132b0db254345f4a87f2108bcb7b885'; 

const FALLBACK_TO_THEMEALDB = true;

const MAX_RESULTS = 12;

// DOM Elements
const searchBtn = document.getElementById("search-btn");

const searchInput = document.getElementById("search-input");

const recipesDiv = document.getElementById("recipes");

const messageP = document.getElementById("message");

const menuBtn = document.getElementById("menu-btn");

const navMenu = document.getElementById("nav-menu");

const navLinks = navMenu.querySelectorAll("a");

// Hamburger Menu Toggle
menuBtn.addEventListener("click", () => {
    navMenu.classList.toggle("show");
    menuBtn.classList.toggle("open");
});


menuBtn.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") 
    {
        e.preventDefault();
        menuBtn.click();
    }
});


// Clear Active Nav Links
function clearActive() 
{
    navLinks.forEach(link => link.classList.remove("active"));
}


// Cuisine Filter (TheMealDB only)
navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        const cuisine = link.dataset.cuisine;
        if (!cuisine) return;

        clearActive();
        link.classList.add("active");
        searchInput.value = "";
        messageP.textContent = `🔍 Searching ${cuisine} recipes...`;
        recipesDiv.innerHTML = "";

        if (navMenu.classList.contains("show")) 
        {
            navMenu.classList.remove("show");
            menuBtn.classList.remove("open");
        }

        fetchTheMealDBRecipesByCuisine(cuisine);
    });
});

// Main Search Function
searchBtn.addEventListener("click", () => {
    const query = searchInput.value.trim();
    if (!query) 
    {
        messageP.textContent = "Please enter a search term.";
        recipesDiv.innerHTML = "";
        clearActive();
        return;
    }

    clearActive();
    fetchRecipes(query);
});


searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") searchBtn.click();
});


// API FUNCTIONS
// Unified Search (Spoonacular + TheMealDB fallback)
async function fetchRecipes(query) 
{
    messageP.textContent = "🔍 Searching recipes...";
    recipesDiv.innerHTML = "";

    
    // Try Spoonacular First
    try 
    {
        const spoonacularRes = await fetch(
            `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(query)}&number=${MAX_RESULTS}&apiKey=${SPOONACULAR_API_KEY}`
        );

        if (!spoonacularRes.ok) 
        {
            const errorData = await spoonacularRes.json();
            throw new Error(errorData.message || "API request failed");
        }

        const data = await spoonacularRes.json();

        if (data.results?.length > 0) 
        {
            const detailedRecipes = await Promise.all(
                data.results.map(recipe =>
                    fetchRecipeDetails(recipe.id, 'spoonacular')
                )
            );
            displayRecipes(detailedRecipes.filter(recipe => recipe !== null), 'spoonacular');
            return;
        }
    } 
    catch (error) 
    {
        console.log("Spoonacular search failed:", error.message);
    }

    
    // Fallback to TheMealDB
    if (FALLBACK_TO_THEMEALDB) 
    {
        try 
        {
            // Try name search first
            const mealRes = await fetch(
                `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`
            );
            const mealData = await mealRes.json();

            if (mealData.meals) 
            {
                displayRecipes(mealData.meals, 'themealdb');
                return;
            }
            

            // Try ingredient search
            const ingredientRes = await fetch(
                `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(query)}`
            );
            const ingredientData = await ingredientRes.json();

            if (ingredientData.meals) 
            {
                const detailedMeals = await Promise.all(
                    ingredientData.meals.slice(0, MAX_RESULTS).map(meal =>
                        fetchRecipeDetails(meal.idMeal, 'themealdb')
                    )
                );
                displayRecipes(detailedMeals.filter(meal => meal !== null), 'themealdb');
                return;
            }

            messageP.textContent = "❌ No recipes found.";
        } 
        catch (error) 
        {
            console.error("TheMealDB error:", error);
            messageP.textContent = "⚠️ Error fetching recipes.";
        }
    } 
    else 
    {
        messageP.textContent = "❌ No recipes found.";
    }
}


// Fetch Detailed Recipe
async function fetchRecipeDetails(id, apiType) 
{
    try 
    {
        if (apiType === 'spoonacular') 
        {
            const res = await fetch(
                `https://api.spoonacular.com/recipes/${id}/information?apiKey=${SPOONACULAR_API_KEY}`
            );
            if (!res.ok) throw new Error("Failed to fetch details");
            return await res.json();
        } 
        else 
        {
            const res = await fetch(
                `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`
            );
            if (!res.ok) throw new Error("Failed to fetch details");
            const data = await res.json();
            return data.meals?.[0] || null;
        }
    } 
    catch (error) 
    {
        console.error(`Failed to fetch details from ${apiType}:`, error.message);
        return null;
    }
}

// TheMealDB Cuisine Filter
async function fetchTheMealDBRecipesByCuisine(cuisine) 
{
    try 
    {
        const res = await fetch(
            `https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(cuisine)}`
        );
        if (!res.ok) throw new Error("Failed to fetch cuisine recipes");
        
        const data = await res.json();

        if (data.meals) 
        {
            const detailedMeals = await Promise.all(
                data.meals.slice(0, MAX_RESULTS).map(meal =>
                    fetchRecipeDetails(meal.idMeal, 'themealdb')
                )
            );
            displayRecipes(detailedMeals.filter(meal => meal !== null), 'themealdb');
        } 
        else 
        {
            messageP.textContent = `❌ No ${cuisine} recipes found.`;
        }
    } 
    catch (error) 
    {
        console.error("Cuisine filter error:", error);
        messageP.textContent = "⚠️ Error fetching recipes.";
    }
}


// DISPLAY FUNCTIONS
function displayRecipes(recipes, apiType) 
{
    if (!recipes?.length) 
    {
        messageP.textContent = "❌ No recipes found.";
        return;
    }

    messageP.textContent = "";
    recipesDiv.innerHTML = "";

    recipes.forEach(recipe => {
        if (!recipe) return; // Skip null recipes

        const card = document.createElement("div");
        card.className = "recipe-card";

        // Image
        const img = document.createElement("img");
        img.src = apiType === 'spoonacular' ?
            (recipe.image || 'placeholder.jpg') :
            (recipe.strMealThumb || 'placeholder.jpg');
        img.alt = apiType === 'spoonacular' ? recipe.title : recipe.strMeal;
        img.loading = "lazy";

        // Content
        const content = document.createElement("div");
        content.className = "recipe-content";

        const title = document.createElement("h3");
        title.textContent = apiType === 'spoonacular' ? recipe.title : recipe.strMeal;

        // Info Section
        const info = document.createElement("div");
        info.className = "recipe-info";

        if (apiType === 'spoonacular') 
        {
            info.innerHTML = `
                <p>Ready in: ${recipe.readyInMinutes} mins</p>
                <p>Servings: ${recipe.servings}</p>
                ${recipe.diets?.length ? `<p>Diets: ${recipe.diets.join(', ')}</p>` : ''}
            `;
        } 
        else 
        {
            info.innerHTML = `
                <p>Category: ${recipe.strCategory || 'N/A'}</p>
                <p>Cuisine: ${recipe.strArea || 'N/A'}</p>
            `;
        }
        
        // View Button
        const link = document.createElement("a");
        link.className = "recipe-link";
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        if (apiType === 'spoonacular') 
        {
            link.href = recipe.sourceUrl || "#";
            link.textContent = "View Recipe";
        } 
        else 
        {
            link.href = recipe.strSource || recipe.strYoutube || "#";
            link.textContent = recipe.strYoutube ? "Watch Video" : "View Recipe";
        }

        
        // Assembly
        content.appendChild(title);
        content.appendChild(info);
        content.appendChild(link);
        card.appendChild(img);
        card.appendChild(content);
        recipesDiv.appendChild(card);
    });
}


